import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_email_verifications_create_email_verification } from "../../../generate/generate_random_discussion_board_registered_user_email_verifications_create_email_verification";
import { prepare_random_discussion_board_registered_user_email_verification } from "../../../prepare/prepare_random_discussion_board_registered_user_email_verification";

export async function test_api_email_verification_token_unique_token_collision_handling(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd12345",
    },
  });
  typia.assert(user);
  // Step 2: Create an email verification token with a specific token string
  const uniqueToken =
    "unique-token-collision-test" + RandomGenerator.alphaNumeric(6);
  const expiredAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour later
  const firstToken =
    await generate_random_discussion_board_registered_user_email_verifications_create_email_verification(
      userConnection,
      {
        body: {
          registeredUserId: user.id,
          token: uniqueToken,
          expiredAt: expiredAt,
        },
      },
    );
  typia.assert(firstToken);
  // Step 3: Try to create another email verification token with the same token string for the same user
  // Expectation: Error or handled gracefully
  await TestValidator.error(
    "duplicate token creation should fail or be handled",
    async () => {
      await generate_random_discussion_board_registered_user_email_verifications_create_email_verification(
        userConnection,
        {
          body: {
            registeredUserId: user.id,
            token: uniqueToken,
            expiredAt: expiredAt,
          },
        },
      );
    },
  );
  // Step 4: Optionally, try for different user with the same token (if possible)
  // To test uniqueness constraint across users
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_registered_user_join(
    anotherUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongP@ssw0rd12345",
      },
    },
  );
  typia.assert(anotherUser);
  // Try to create token with same token string for different user
  await TestValidator.error(
    "duplicate token creation for different user should fail or be handled",
    async () => {
      await generate_random_discussion_board_registered_user_email_verifications_create_email_verification(
        anotherUserConnection,
        {
          body: {
            registeredUserId: anotherUser.id,
            token: uniqueToken,
            expiredAt: expiredAt,
          },
        },
      );
    },
  );
  // Step 5: Confirm no duplicates exist in the system by trying to create tokens with similar unique tokens
  const slightlyDifferentToken = uniqueToken + RandomGenerator.alphaNumeric(2);
  const validToken =
    await generate_random_discussion_board_registered_user_email_verifications_create_email_verification(
      userConnection,
      {
        body: {
          registeredUserId: user.id,
          token: slightlyDifferentToken,
          expiredAt: new Date(Date.now() + 7200 * 1000).toISOString(),
        },
      },
    );
  typia.assert(validToken);
}
