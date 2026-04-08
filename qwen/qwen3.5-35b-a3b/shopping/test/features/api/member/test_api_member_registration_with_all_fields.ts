import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Generate complete registration input with all fields
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) + "A", // Ensure uppercase
    display_name: RandomGenerator.name(),
    phone_number: "+82" + RandomGenerator.mobile(), // E.164 format
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallMember.IJoin;
  // Register member with all fields using utility function
  const output = await authorize_member_join(connection, {
    body: joinInput,
  });
  typia.assert(output);
  // Validate member identity fields
  TestValidator.equals("email matches input", output.email, joinInput.email);
  TestValidator.equals(
    "display_name matches input",
    output.display_name,
    joinInput.display_name,
  );
  TestValidator.equals(
    "phone_number matches input",
    output.phone_number,
    joinInput.phone_number,
  );
  TestValidator.predicate(
    "id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    output.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    output.updated_at !== undefined,
  );
  // Validate JWT tokens structure
  TestValidator.predicate(
    "access token is non-empty string",
    output.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    output.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    output.expired_at !== undefined,
  );
  // Validate token object structure
  TestValidator.equals(
    "token.access matches output access",
    output.token.access,
    output.access,
  );
  TestValidator.equals(
    "token.refresh matches output refresh",
    output.token.refresh,
    output.refresh,
  );
  TestValidator.equals(
    "token.expired_at matches output expired_at",
    output.token.expired_at,
    output.expired_at,
  );
  // Test duplicate email rejection
  await TestValidator.error("duplicate email rejected", async () => {
    const duplicateJoinInput = {
      ...joinInput,
      display_name: RandomGenerator.name(),
      phone_number: "+82" + RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin;
    await authorize_member_join(connection, {
      body: duplicateJoinInput,
    });
  });
  // Test immediate authentication with new credentials
  const testLoginConnection: api.IConnection = { host: connection.host };
  const loginOutput = await authorize_member_login(testLoginConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.ILogin,
  });
  typia.assert(loginOutput);
  TestValidator.equals(
    "login identity matches registration",
    loginOutput.id,
    output.id,
  );
  TestValidator.equals(
    "login email matches registration",
    loginOutput.email,
    output.email,
  );
}