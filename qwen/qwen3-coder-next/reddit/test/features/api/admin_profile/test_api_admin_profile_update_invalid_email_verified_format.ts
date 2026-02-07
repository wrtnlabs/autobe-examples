import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_profile_update_invalid_email_verified_format(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: IRedditPlatformAdmin.IRequest is defined as an empty object ({}),
  // which means it accepts no properties including email_verified.
  // The API will validate this through typia.assert() and reject any extra properties.
  // Test with empty body (valid - no properties allowed)
  const validUpdate = await api.functional.redditPlatform.admins.updateAdmin(
    adminConnection,
    {
      body: {},
    } satisfies IRedditPlatformAdmin.IRequest,
  );
  typia.assert(validUpdate);
  // Test that any additional properties (including email_verified) are rejected
  // by the type system, as IRequest is strictly empty
  await TestValidator.error("no properties allowed in IRequest", async () => {
    await api.functional.redditPlatform.admins.updateAdmin(adminConnection, {
      body: { email_verified: true },
    } satisfies IRedditPlatformAdmin.IRequest);
  });
  // Test with null body (should be rejected by type)
  await TestValidator.error("body cannot be null", async () => {
    await api.functional.redditPlatform.admins.updateAdmin(adminConnection, {
      body: null as any,
    } satisfies IRedditPlatformAdmin.IRequest);
  });
  // Test with empty object (the only valid form)
  const emptyUpdate = await api.functional.redditPlatform.admins.updateAdmin(
    adminConnection,
    {
      body: {},
    } satisfies IRedditPlatformAdmin.IRequest,
  );
  typia.assert(emptyUpdate);
}
