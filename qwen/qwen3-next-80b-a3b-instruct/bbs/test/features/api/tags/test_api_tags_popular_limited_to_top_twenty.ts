import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardSearchTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_tags_popular_limited_to_top_twenty(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Fetch popular tags
  const popularTagsRaw =
    await api.functional.economicBoard.administrator.tags.popular(
      adminConnection,
    );
  // Validate response is an array of objects (IEconomicBoardSearchTag[])
  const popularTags: IEconomicBoardSearchTag[] =
    typia.assert<Array<IEconomicBoardSearchTag>>(popularTagsRaw);
  // Validate that the result is an array
  TestValidator.predicate("result is array", Array.isArray(popularTags));
  // Validate that the number of tags does not exceed 20 (enforced limit)
  TestValidator.predicate(
    "top 20 limit enforced",
    () => popularTags.length <= 20,
  );
  // Validate that at least one tag is returned (reasonable assumption)
  TestValidator.predicate(
    "at least one popular tag exists",
    () => popularTags.length > 0,
  );
}
