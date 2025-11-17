import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_login_malformed_email(
  connection: api.IConnection,
) {
  // Test malformed email: missing @ symbol
  await TestValidator.error(
    "login should fail with email missing @ symbol",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          search: "malformedemail.com", // No @ symbol
        } satisfies IEconomicBoardModerator.IRequest,
      });
    },
  );

  // Test malformed email: empty local part
  await TestValidator.error(
    "login should fail with empty local part in email",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          search: "@example.com", // Empty before @
        } satisfies IEconomicBoardModerator.IRequest,
      });
    },
  );

  // Test malformed email: empty domain part
  await TestValidator.error(
    "login should fail with empty domain part in email",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          search: "user@", // Empty after @
        } satisfies IEconomicBoardModerator.IRequest,
      });
    },
  );

  // Test malformed email: multiple @ symbols
  await TestValidator.error(
    "login should fail with multiple @ symbols in email",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          search: "user@@example.com", // Double @
        } satisfies IEconomicBoardModerator.IRequest,
      });
    },
  );

  // Test malformed email: email with spaces
  await TestValidator.error(
    "login should fail with email containing spaces",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          search: "user name@example.com", // Space in email
        } satisfies IEconomicBoardModerator.IRequest,
      });
    },
  );

  // Test malformed email: no domain extension
  await TestValidator.error(
    "login should fail with email lacking domain extension",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          search: "user@domain", // Missing .com/.net/etc
        } satisfies IEconomicBoardModerator.IRequest,
      });
    },
  );
}
