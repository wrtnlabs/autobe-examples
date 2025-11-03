import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostSnapshot";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPostSnapshot";

export async function test_api_post_snapshot_history_author(
  connection: api.IConnection,
) {
  // Unique suffix to avoid collisions across test runs
  const suffix: string = Date.now().toString();

  // 1) Author (community member) joins and receives tokens
  const author: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email: `author-${suffix}@example.test`,
        username: `author_${suffix}`,
        password: "Passw0rd!",
        display_name: `Author ${suffix}`,
        profile: {
          display_name: `Author ${suffix}`,
          bio: RandomGenerator.paragraph({ sentences: 6 }),
          avatar_uri: null,
        },
        session_context: {
          href: "https://example.test/signup",
          referrer: "https://example.test/",
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(author);

  // At this point the SDK attached Authorization header into connection

  // 2) Create a community
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: `test-community-${suffix}`,
          slug: `test-community-${suffix}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Upload a media item (url-mode). Use allowed mime type: image/png
  const media: ICommunityBbsPostMedia =
    await api.functional.communityBbs.communityMember.uploads.create(
      connection,
      {
        body: {
          upload_mode: "url",
          url: "https://cdn.example.test/test-image.png",
          media_type: "image/png",
          size_bytes: 1024,
          ordering: 0,
          community_bbs_post_id: null,
        } satisfies ICommunityBbsPostMedia.ICreate,
      },
    );
  typia.assert(media);

  // 4) Create a post in the community referencing the uploaded media
  const createdPost: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          title: `Initial title ${suffix}`,
          body: `Initial body ${RandomGenerator.paragraph({ sentences: 3 })}`,
          post_type: "image",
          media_ids: [media.id],
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(createdPost);

  // 5) Update the post (author edit) - this should create a snapshot on the server
  const updatedPost: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.posts.update(connection, {
      postId: createdPost.id,
      body: {
        title: `Updated title ${suffix}`,
        body: `Updated body ${RandomGenerator.paragraph({ sentences: 2 })}`,
      } satisfies ICommunityBbsPost.IUpdate,
    });
  typia.assert(updatedPost);

  // 6) Retrieve snapshot history as the author
  const history: IPageICommunityBbsPostSnapshot.ISummary =
    await api.functional.communityBbs.communityMember.posts.history.index(
      connection,
      {
        postId: createdPost.id,
      },
    );
  typia.assert(history);

  // 7) Business assertions
  // - At least two snapshots (initial create + update)
  TestValidator.predicate(
    "history has at least two snapshots",
    history.data.length >= 2,
  );

  // - Each snapshot contains required fields (typia.assert already validated shape)
  TestValidator.predicate(
    "first snapshot has required fields",
    typeof history.data[0].title === "string" &&
      history.data[0].snapshot_at !== undefined,
  );

  // - Newest-first ordering: check entire list is non-increasing by snapshot_at
  const timestamps: number[] = history.data.map((s) =>
    new Date(s.snapshot_at).getTime(),
  );
  let ordered = true;
  for (let i = 1; i < timestamps.length; ++i) {
    if (timestamps[i - 1] < timestamps[i]) {
      ordered = false;
      break;
    }
  }
  TestValidator.predicate("snapshots are ordered newest-first", ordered);

  // - The most recent snapshot should reflect the updated title
  TestValidator.equals(
    "most recent snapshot reflects updated title",
    history.data[0].title,
    updatedPost.title,
  );

  // - Pagination metadata should be present and sensible
  TestValidator.predicate(
    "pagination object exists and has non-negative numbers",
    history.pagination !== undefined &&
      typeof history.pagination.current === "number" &&
      history.pagination.current >= 0 &&
      typeof history.pagination.limit === "number" &&
      history.pagination.limit >= 0,
  );

  // 8) Negative check: unauthenticated connection cannot access history
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot fetch post history",
    async () => {
      await api.functional.communityBbs.communityMember.posts.history.index(
        unauthConn,
        { postId: createdPost.id },
      );
    },
  );
}
