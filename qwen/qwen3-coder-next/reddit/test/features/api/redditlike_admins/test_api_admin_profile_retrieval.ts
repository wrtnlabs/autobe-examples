import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random admin UUID for testing
  const adminId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve admin profile using the SDK function
  const admin = await api.functional.redditLike.admins.at(connection, {
    adminId,
  });
  // Complete validation of response structure matches IRedditLikeAdmin DTO
  typia.assert(admin);
}
