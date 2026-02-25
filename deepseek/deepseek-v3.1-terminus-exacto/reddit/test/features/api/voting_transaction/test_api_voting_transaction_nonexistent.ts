import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_voting_transaction_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create a user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a regular user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Generate a valid UUID that doesn't exist in the system
  const nonExistentTransactionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent voting transaction and verify 404 error
  await TestValidator.httpError(
    "retrieve non-existent voting transaction",
    404,
    async () => {
      await api.functional.communityPlatform.user.voting_transactions.at(
        userConnection,
        {
          transactionId: nonExistentTransactionId,
        },
      );
    },
  );
}
