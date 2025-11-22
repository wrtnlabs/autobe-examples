import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";

export async function test_api_registered_member_join_invalid_email_format(
  connection: api.IConnection,
) {
  // Test registration with email missing @ symbol
  await TestValidator.error(
    "registration should fail with email missing @ symbol",
    async () => {
      await api.functional.auth.registeredMember.join(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: "invalidemail.com",
          status: "active",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
      });
    },
  );

  // Test registration with email missing domain
  await TestValidator.error(
    "registration should fail with email missing domain",
    async () => {
      await api.functional.auth.registeredMember.join(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: "user@",
          status: "active",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
      });
    },
  );

  // Test registration with email missing local part
  await TestValidator.error(
    "registration should fail with email missing local part",
    async () => {
      await api.functional.auth.registeredMember.join(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: "@domain.com",
          status: "active",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
      });
    },
  );

  // Test registration with invalid characters in email
  await TestValidator.error(
    "registration should fail with invalid characters in email",
    async () => {
      await api.functional.auth.registeredMember.join(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: "user@domain!.com",
          status: "active",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
      });
    },
  );

  // Test registration with multiple @ symbols
  await TestValidator.error(
    "registration should fail with multiple @ symbols",
    async () => {
      await api.functional.auth.registeredMember.join(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: "user@@domain.com",
          status: "active",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
      });
    },
  );

  // Test registration with empty email
  await TestValidator.error(
    "registration should fail with empty email",
    async () => {
      await api.functional.auth.registeredMember.join(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: "",
          status: "active",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
      });
    },
  );

  // Test registration with email missing TLD
  await TestValidator.error(
    "registration should fail with email missing TLD",
    async () => {
      await api.functional.auth.registeredMember.join(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: "user@domain",
          status: "active",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
      });
    },
  );

  // Test registration with spaces in email
  await TestValidator.error(
    "registration should fail with spaces in email",
    async () => {
      await api.functional.auth.registeredMember.join(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: "user name@domain.com",
          status: "active",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
      });
    },
  );

  // Test registration with consecutive dots
  await TestValidator.error(
    "registration should fail with consecutive dots in email",
    async () => {
      await api.functional.auth.registeredMember.join(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: "user..name@domain.com",
          status: "active",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
      });
    },
  );
}
