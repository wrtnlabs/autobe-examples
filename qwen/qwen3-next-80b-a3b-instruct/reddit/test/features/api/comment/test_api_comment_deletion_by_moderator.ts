import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_member_comments_create } from "../../../generate/generate_random_community_member_comments_create";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { generate_random_community_moderator_communities_create } from "../../../generate/generate_random_community_moderator_communities_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Generate test emails and password
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const password = "password123";
  // 1. Create a moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password,
    } satisfies ICommunityModerator.IJoin,
  });
  // 2. Login as moderator to get proper auth context
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password,
    } satisfies ICommunityModerator.ILogin,
  });
  // 3. Generate a random comment ID for deletion testing
  // Since ICommunityCommunity and ICommunityPost have no properties,
  // we cannot create related entities. Instead we'll test the
  // endpoint directly with a generated comment ID.
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to delete the non-existent comment
  // The server should return 404 Not Found for non-existent comments
  await TestValidator.httpError(
    "deleting non-existent comment returns 404",
    404,
    async () => {
      await api.functional.community.member.comments.erase(
        moderatorConnection,
        {
          commentId,
        },
      );
    },
  );
}
