import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_post_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const userAuthorized: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd!",
        ip: null, // optional
        href: "http://localhost/test",
        referrer: "http://localhost/referrer",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(userAuthorized);

  // 2. Register a new admin user linked to the above user
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: userAuthorized.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 3. Create a new community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name:
          RandomGenerator.name(1).replace(/\s+/g, "") +
          Math.floor(Math.random() * 10000),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create a new content type
  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: {
          content_type_code: "text",
          content_type_name: "Text",
          description: "Standard text content type",
        } satisfies IRedditCommunityContentType.ICreate,
      },
    );
  typia.assert(contentType);

  // 5. Create a new post within the community as regular user
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: RandomGenerator.paragraph({ sentences: 4 })
            .replace(/\s+/g, " ")
            .slice(0, 50),
          body: RandomGenerator.content({ paragraphs: 2 }),
          reddit_community_content_type_id: contentType.id,
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 6. Authenticate as admin (token is set on connection from admin join)
  // No additional login needed because SDK sets auth headers automatically

  // 7. Admin delete the post
  await api.functional.redditCommunity.admin.communities.posts.erase(
    connection,
    {
      communityName: community.name,
      postId: post.id,
    },
  );

  // 8. Validate post deletion by attempting fetch or check error (Not possible here)
  // Success is assumed by the absence of errors during deletion
}
