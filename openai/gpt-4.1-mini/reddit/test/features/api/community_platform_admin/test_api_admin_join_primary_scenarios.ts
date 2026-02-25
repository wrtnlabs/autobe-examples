import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_primary_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful admin account registration
  const adminEmail = typia.random<string & typia.tags.Format<"email">>();
  const adminPassword = "StrongPass123!";
  const adminDisplayName = RandomGenerator.name(1);
  const adminBio = RandomGenerator.paragraph({ sentences: 2 });
  const adminAvatarUrl = `https://example.com/avatar/${RandomGenerator.alphaNumeric(10)}.png`;
  const authorized = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: adminDisplayName,
      bio: adminBio,
      avatarUrl: adminAvatarUrl,
    },
  });
  typia.assert(authorized);
  // Validations on returned authorized data
  TestValidator.equals("email matches", authorized.email, adminEmail);
  TestValidator.equals(
    "displayName matches",
    authorized.displayName,
    adminDisplayName,
  );
  TestValidator.equals("bio matches", authorized.bio, adminBio);
  TestValidator.equals(
    "avatarUrl matches",
    authorized.avatarUrl,
    adminAvatarUrl,
  );
  TestValidator.predicate(
    "token.access is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid ISO string",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid ISO string",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // Scenario 2: Admin registration with duplicate email
  await TestValidator.error("duplicate email error", async () => {
    await authorize_admin_join(connection, {
      body: {
        email: adminEmail, // duplicate
        password: "AnotherPass123!",
        displayName: RandomGenerator.name(1),
      },
    });
  });
  // Scenario 3: Admin registration with weak password
  const weakPassword = "123"; // too short/weak
  await TestValidator.error("weak password error", async () => {
    await authorize_admin_join(connection, {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: weakPassword,
        displayName: RandomGenerator.name(1),
      },
    });
  });
}
