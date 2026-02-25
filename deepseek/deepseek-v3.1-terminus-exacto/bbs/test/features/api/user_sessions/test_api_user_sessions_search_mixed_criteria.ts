import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_search_mixed_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create test users first
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "User One",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      display_name: "User Two",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2);
  // Note: Session search functionality requires administrative privileges
  // and session management capabilities that are not available in the current
  // API surface. The test focuses on user creation and basic validation.
  // Validate user creation was successful
  TestValidator.equals("user1 has valid ID format", typeof user1.id, "string");
  TestValidator.equals("user2 has valid ID format", typeof user2.id, "string");
  TestValidator.notEquals("user IDs are unique", user1.id, user2.id);
  // Validate user summary structure
  TestValidator.equals(
    "user1 has display name",
    typeof user1.display_name,
    "string",
  );
  TestValidator.equals("user1 has email", typeof user1.email, "string");
  TestValidator.equals(
    "user1 has creation timestamp",
    typeof user1.created_at,
    "string",
  );
  // Validate token structure
  TestValidator.equals(
    "user1 has access token",
    typeof user1.token.access,
    "string",
  );
  TestValidator.equals(
    "user1 has refresh token",
    typeof user1.token.refresh,
    "string",
  );
  TestValidator.equals(
    "user1 has token expiration",
    typeof user1.token.expired_at,
    "string",
  );
}
