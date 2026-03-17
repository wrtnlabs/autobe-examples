import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentDeletion";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentDeletion";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_deletion_audit_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular member user and authenticate
  const regularConnection: api.IConnection = { host: connection.host };
  const regularAuth = await authorize_member_join(regularConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(regularAuth);
  // Step 2: Regular member attempts to access comment deletion audit
  // This should fail with 403 Forbidden regardless of comment ownership
  const commentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "regular member cannot access comment deletion audit trail",
    [403],
    async () => {
      await api.functional.redditCommunity.comments.deletions.index(
        regularConnection,
        {
          commentId,
          body: {
            deleted_by_id: typia.random<string & tags.Format<"uuid">>(),
            deletion_reason: typia.random<string>(),
          } satisfies IRedditCommunityCommentDeletion.IRequest,
        },
      );
    },
  );
}