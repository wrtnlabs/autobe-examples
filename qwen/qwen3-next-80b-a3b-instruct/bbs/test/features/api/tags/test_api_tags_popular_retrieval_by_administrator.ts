import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_tags_popular_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Perform administrator join to establish context
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // Use the authenticated connection to fetch popular tags
  // The schema mistakenly defines IEconomicBoardSearchTag as single object
  // but the endpoint returns an array as per scenario - we must follow the real behavior
  const popularTags =
    await api.functional.economicBoard.administrator.tags.popular(
      adminConnection,
    );
  
  // Override the faulty type definition with actual structure
  type PopularTag = {
    text: string;
    count: number;
  };
  
  const tagsArray: PopularTag[] = typia.assert<PopularTag[]>(popularTags);
  
  // Validate response structure as array (scenario requirement)
  TestValidator.equals("response is array", Array.isArray(tagsArray), true);
  TestValidator.equals("exactly 20 tags returned", tagsArray.length, 20);
  
  // Verify each tag has non-zero count and is properly structured
  for (const tag of tagsArray) {
    TestValidator.predicate(
      "tag has text property",
      typeof tag.text === "string",
    );
    TestValidator.predicate(
      "tag has count property",
      typeof tag.count === "number",
    );
    TestValidator.predicate("count is non-zero", tag.count > 0);
    TestValidator.predicate("text is trimmed", tag.text === tag.text.trim());
    TestValidator.predicate(
      "text is lowercase",
      tag.text === tag.text.toLowerCase(),
    );
  }
}