import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_login_email_invalid_format(
  connection: api.IConnection,
) {
  // Test with email missing @ symbol
  await TestValidator.error("email without @ symbol should fail", async () => {
    await api.functional.auth.citizen.login(connection, {
      body: {
        email: "invalidemail", // Missing @ symbol
        password: "password123",
      } satisfies IEconomicBoardCitizen.ILogin,
    });
  });

  // Test with email missing domain
  await TestValidator.error("email missing domain should fail", async () => {
    await api.functional.auth.citizen.login(connection, {
      body: {
        email: "user@", // Missing domain
        password: "password123",
      } satisfies IEconomicBoardCitizen.ILogin,
    });
  });

  // Test with email missing local part
  await TestValidator.error(
    "email missing local part should fail",
    async () => {
      await api.functional.auth.citizen.login(connection, {
        body: {
          email: "@domain.com", // Missing local part
          password: "password123",
        } satisfies IEconomicBoardCitizen.ILogin,
      });
    },
  );

  // Test with multiple @ symbols
  await TestValidator.error(
    "email with multiple @ symbols should fail",
    async () => {
      await api.functional.auth.citizen.login(connection, {
        body: {
          email: "user@@domain.com", // Multiple @ symbols
          password: "password123",
        } satisfies IEconomicBoardCitizen.ILogin,
      });
    },
  );

  // Test with space in email
  await TestValidator.error("email with spaces should fail", async () => {
    await api.functional.auth.citizen.login(connection, {
      body: {
        email: "user name@domain.com", // Contains space
        password: "password123",
      } satisfies IEconomicBoardCitizen.ILogin,
    });
  });

  // Test with leading/trailing spaces
  await TestValidator.error(
    "email with leading/trailing spaces should fail",
    async () => {
      await api.functional.auth.citizen.login(connection, {
        body: {
          email: "  user@domain.com  ", // Leading and trailing spaces
          password: "password123",
        } satisfies IEconomicBoardCitizen.ILogin,
      });
    },
  );

  // Test with special characters not allowed in local part
  await TestValidator.error(
    "email with invalid special characters should fail",
    async () => {
      await api.functional.auth.citizen.login(connection, {
        body: {
          email: "user!@domain.com", // Contains exclamation mark
          password: "password123",
        } satisfies IEconomicBoardCitizen.ILogin,
      });
    },
  );

  // Test with empty email
  await TestValidator.error("empty email should fail", async () => {
    await api.functional.auth.citizen.login(connection, {
      body: {
        email: "", // Empty string
        password: "password123",
      } satisfies IEconomicBoardCitizen.ILogin,
    });
  });

  // Test with email that has no dot in domain
  await TestValidator.error(
    "email with no dot in domain should fail",
    async () => {
      await api.functional.auth.citizen.login(connection, {
        body: {
          email: "user@domain", // No dot in domain
          password: "password123",
        } satisfies IEconomicBoardCitizen.ILogin,
      });
    },
  );

  // Test with email with consecutive dots in domain
  await TestValidator.error(
    "email with consecutive dots in domain should fail",
    async () => {
      await api.functional.auth.citizen.login(connection, {
        body: {
          email: "user@domain..com", // Consecutive dots
          password: "password123",
        } satisfies IEconomicBoardCitizen.ILogin,
      });
    },
  );
}
