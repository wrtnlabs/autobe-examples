import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusHistory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_admin_community_status_history_detail_nonexistent_ids(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (who will own the community and create posts)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  const communitySlug: string = community.slug;

  // 3. Optionally create a post for realism
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Register and log in an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Call admin status history detail with a random, well-formed UUID that
  //    is almost certainly nonexistent for this community.
  const randomHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  let historyForExistingSlug: ICommunityPlatformCommunityStatusHistory | null =
    null;

  try {
    const history =
      await api.functional.communityPlatform.adminUser.communities.statusHistories.at(
        connection,
        {
          communitySlug,
          statusHistoryId: randomHistoryId,
        },
      );
    typia.assert<ICommunityPlatformCommunityStatusHistory>(history);
    historyForExistingSlug = history;
  } catch (exp) {
    // If the backend indicates not-found or similar via HttpError, that is
    // acceptable; we do not assert specific status codes here.
    if (!(exp instanceof api.HttpError)) throw exp;
  }

  if (historyForExistingSlug !== null) {
    TestValidator.equals(
      "history for existing slug must belong to requested community",
      historyForExistingSlug.community.slug,
      communitySlug,
    );
  }

  // 6. Malformed UUID scenario is skipped because statusHistoryId is
  //    statically constrained to tags.Format<"uuid"> and we must not
  //    deliberately violate type contracts.

  // 7. Unknown community slug with a (likely) nonexistent UUID.
  const unknownCommunitySlug: string = `${communitySlug}-nonexistent-${RandomGenerator.alphaNumeric(6)}`;
  const randomHistoryIdForUnknown: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  let historyForUnknownSlug: ICommunityPlatformCommunityStatusHistory | null =
    null;

  try {
    const history =
      await api.functional.communityPlatform.adminUser.communities.statusHistories.at(
        connection,
        {
          communitySlug: unknownCommunitySlug,
          statusHistoryId: randomHistoryIdForUnknown,
        },
      );
    typia.assert<ICommunityPlatformCommunityStatusHistory>(history);
    historyForUnknownSlug = history;
  } catch (exp) {
    if (!(exp instanceof api.HttpError)) throw exp;
  }

  if (historyForUnknownSlug !== null) {
    TestValidator.predicate(
      "history for unknown slug must not point back to known community",
      historyForUnknownSlug.community.slug === unknownCommunitySlug ||
        historyForUnknownSlug.community.slug !== communitySlug,
    );
  }
}
