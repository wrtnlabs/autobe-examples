import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_comment_vote_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test attempting to retrieve a non-existent vote on a comment by an authorized admin user.
  // 1. Admin user registers and obtains authentication token.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: ICommunityPlatformAdmin.IJoin = {};
  const authorized: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminJoinBody });
  typia.assert(authorized);
  // Update adminConnection headers with authorization token.
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Admin sends GET request to the endpoint with non-existent commentId and voteId.
  // Use typia.random with correct format to generate random UUIDs.
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  const fakeVoteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate the operation returns a 404 error indicating vote not found.
  await TestValidator.httpError(
    "admin comment vote retrieval not found",
    404,
    async () => {
      await api.functional.communityPlatform.admin.comments.votes.at(
        adminConnection,
        {
          commentId: fakeCommentId,
          voteId: fakeVoteId,
        },
      );
    },
  );
}
