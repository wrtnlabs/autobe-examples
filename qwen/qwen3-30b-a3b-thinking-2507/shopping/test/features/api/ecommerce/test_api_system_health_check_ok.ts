import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceNoopResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceNoopResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_health_check_ok(
  connection: api.IConnection,
): Promise<void> {
  const response = await api.functional.ecommerce.noop(connection);
  typia.assert(response);
}
