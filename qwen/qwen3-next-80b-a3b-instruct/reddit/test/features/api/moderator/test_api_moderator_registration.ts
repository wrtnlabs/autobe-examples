import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for moderator registration
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Generate valid moderator registration data
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32);
  // Perform moderator registration using the utility function (priority over SDK)
  const registeredModerator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: moderatorEmail,
        password_hash: passwordHash,
      } satisfies ICommunityBbsModerator.IJoin,
    });
  // Validate the response structure and types
  typia.assert(registeredModerator);
  // Verify essential properties
  TestValidator.equals(
    "moderator email matches",
    registeredModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "token type is bearer",
    registeredModerator.token_type,
    "bearer",
  );
  TestValidator.predicate(
    "status is active",
    registeredModerator.status === "active",
  );
}
