import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economic_political_board_admin_ban_records_create } from "../../../generate/generate_random_economic_political_board_admin_ban_records_create";
import { prepare_random_economic_political_board_ban_record } from "../../../prepare/prepare_random_economic_political_board_ban_record";

export async function test_api_admin_login_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account (the one to be banned)
  const admin1Email = typia.random<(string & tags.Format<"email">)>();
  const admin1Password = RandomGenerator.alphaNumeric(16);
  const admin1Href = typia.random<(string & tags.Format<"uri">)>();
  const admin1Referrer = typia.random<(string & tags.Format<"uri">)>();
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(admin1Email),
      password: admin1Password,
      href: typia.assert<string & tags.Format<"uri">>(admin1Href),
      referrer: typia.assert<string & tags.Format<"uri">>(admin1Referrer),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // 2. Create second admin account (super admin who will perform ban)
  const admin2Email = typia.random<(string & tags.Format<"email">)>();
  const admin2Password = RandomGenerator.alphaNumeric(16);
  const admin2Href = typia.random<(string & tags.Format<"uri">)>();
  const admin2Referrer = typia.random<(string & tags.Format<"uri">)>();
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(admin2Email),
      password: admin2Password,
      href: typia.assert<string & tags.Format<"uri">>(admin2Href),
      referrer: typia.assert<string & tags.Format<"uri">>(admin2Referrer),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // 3. Ban the first admin using second admin's connection
  const banConnection: api.IConnection = { host: connection.host };
  banConnection.headers = {
    ...banConnection.headers,
    Authorization: admin2Auth.token.access,
  };
  const banRecord =
    await generate_random_economic_political_board_admin_ban_records_create(
      banConnection,
      {
        body: {
          user_id: admin1Auth.id,
          reason: "Test ban for e2e testing - policy violation",
        } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Verify ban record contains correct user reference
  TestValidator.equals(
    "ban record user matches banned admin",
    banRecord.user.id,
    admin1Auth.id,
  );
  // 4. Attempt login with banned admin's CORRECT credentials - should fail due to ban
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "banned admin cannot login with correct password",
    async () => {
      await authorize_admin_login(loginConnection, {
        body: {
          email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(admin1Email),
          password: admin1Password,
        } satisfies IEconomicPoliticalBoardAdmin.ILogin,
      });
    },
  );
  // 5. Verify the error status is appropriate (401 or 403)
  try {
    await authorize_admin_login(loginConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(admin1Email),
        password: admin1Password,
      } satisfies IEconomicPoliticalBoardAdmin.ILogin,
    });
    throw new Error("Expected login to fail");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.predicate(
        "ban rejection returns appropriate status",
        error.status === 401 || error.status === 403,
      );
    } else {
      throw error;
    }
  }
  // 6. Verify error message doesn't reveal email existence (security best practice)
  // The error should say something like "invalid credentials" not "user not found"
  // This prevents email enumeration attacks
  try {
    await authorize_admin_login(loginConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(admin1Email),
        password: admin1Password,
      } satisfies IEconomicPoliticalBoardAdmin.ILogin,
    });
    throw new Error("Expected login to fail");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      const errorMessage =
        typeof error.message === "string" ? error.message : "";
      TestValidator.predicate(
        "error message does not reveal email existence",
        !errorMessage.toLowerCase().includes("not found") &&
          !errorMessage.toLowerCase().includes("does not exist"),
      );
    } else {
      throw error;
    }
  }
  // 7. Verify that login with non-existent email also fails appropriately
  const fakeEmail = "nonexistent@example.com";
  const fakePassword = RandomGenerator.alphaNumeric(16);
  try {
    await authorize_admin_login(loginConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(fakeEmail),
        password: fakePassword,
      } satisfies IEconomicPoliticalBoardAdmin.ILogin,
    });
    throw new Error("Expected login to fail");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.predicate(
        "fake email also returns appropriate status",
        error.status === 401 || error.status === 403,
      );
      // Both real (banned) and fake emails should return similar error messages
      const fakeErrorMessage =
        typeof error.message === "string" ? error.message : "";
      TestValidator.predicate(
        "error message does not reveal email existence for non-existent user",
        !fakeErrorMessage.toLowerCase().includes("not found") &&
          !fakeErrorMessage.toLowerCase().includes("does not exist"),
      );
    } else {
      throw error;
    }
  }
}