import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_detail_existing_record_lookup(
  connection: api.IConnection,
): Promise<void> {
  const anonymousConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
  };
  const adminId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000001";
  const output = await api.functional.communityPlatform.admins.at(
    anonymousConnection,
    {
      adminId,
    },
  );
  typia.assert(output);
  typia.assertEquals<ICommunityPlatformAdmin>(output);
  TestValidator.equals(
    "id matches requested administrator",
    output.id,
    adminId,
  );
  TestValidator.predicate("email is non-empty", output.email.length > 0);
  TestValidator.predicate("status is non-empty", output.status.length > 0);
  TestValidator.predicate(
    "created_at is not after updated_at",
    new Date(output.created_at).getTime() <=
      new Date(output.updated_at).getTime(),
  );
  TestValidator.equals(
    "email verification timestamp is nullable by contract",
    output.email_verified_at === null ||
      typeof output.email_verified_at === "string",
    true,
  );
  TestValidator.equals(
    "last sign-in timestamp is nullable by contract",
    output.last_signed_in_at === null ||
      typeof output.last_signed_in_at === "string",
    true,
  );
  TestValidator.equals(
    "deletion timestamp is nullable by contract",
    output.deleted_at === null || typeof output.deleted_at === "string",
    true,
  );
}
