import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformFlags } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFlags";
export async function test_api_system_flags_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // This endpoint requires no authentication as system flags are public configuration metadata
  const flags: ICommunityPlatformFlags[] =
    typia.assert<ICommunityPlatformFlags[]>(
      await api.functional.communityPlatform.reports.system.flags.index(
        connection,
      ),
    );
  // Validate that the response is an array of flags
  typia.assert(flags);
  // Verify that at least one system flag is returned
  TestValidator.predicate("at least one system flag exists", flags.length > 0);
  // Validate each flag in the returned array matches the ICommunityPlatformFlags schema
  for (const flag of flags) {
    // Verify all required properties exist and have correct types
    TestValidator.equals(
      "flag name is a non-empty string",
      typeof flag.name,
      "string",
    );
    TestValidator.predicate("flag name is not empty", flag.name.length > 0);
    TestValidator.equals("flag value is a string", typeof flag.value, "string");
    TestValidator.equals(
      "flag description is a string",
      typeof flag.description,
      "string",
    );
    TestValidator.equals(
      "flag is_active is a boolean",
      typeof flag.is_active,
      "boolean",
    );
    TestValidator.equals(
      "flag created_at is a string",
      typeof flag.created_at,
      "string",
    );
    TestValidator.predicate(
      "flag created_at matches ISO 8601 format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        flag.created_at,
      ),
    );
  }
}