import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
export async function test_api_channel_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  const channelCode = typia.random<
    string & tags.Pattern<"^(mainstore-|partner-)[a-zA-Z0-9_-]+$">
  >();
  const response: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.at(connection, {
      channelCode,
    });
  typia.assert(response);
  TestValidator.equals(
    "channel code matches request",
    response.name,
    channelCode,
  );
  TestValidator.predicate(
    "description has minimum length",
    response.description.length >= 1,
  );
  TestValidator.predicate(
    "description has maximum length",
    response.description.length <= 500,
  );
  TestValidator.predicate(
    "salesType is valid",
    ["online", "physical", "marketplace", "hybrid"].includes(
      response.salesType,
    ),
  );
}
