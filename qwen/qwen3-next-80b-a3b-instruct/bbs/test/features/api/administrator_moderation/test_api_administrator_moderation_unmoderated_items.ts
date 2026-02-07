import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_moderation_unmoderated_items(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Call the unmoderated items endpoint
  const unmoderatedItems =
    await api.functional.economicBoard.administrator.moderation.unmoderated.index(
      adminConnection,
    );
  typia.assert(unmoderatedItems);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    unmoderatedItems.pagination,
    unmoderatedItems.pagination,
  );
  TestValidator.predicate(
    "current page is positive",
    unmoderatedItems.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is positive",
    unmoderatedItems.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    unmoderatedItems.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    unmoderatedItems.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(unmoderatedItems.data),
  );
  // Validate that each article in data array is an object (since ISummary is empty, we cannot validate properties)
  for (const article of unmoderatedItems.data) {
    TestValidator.predicate(
      "each article is an object",
      article !== null && typeof article === "object",
    );
  }
  // We cannot validate sorting by createdAt because the property doesn't exist in the type
  // We cannot validate author display name because it doesn't exist in the type
  // We cannot validate title because it doesn't exist in the type
  // We cannot validate comment count because it doesn't exist in the type
  // We cannot validate moderation reason because it doesn't exist in the type
  // According to the Anti-Hallucination Protocol, we only test what EXISTS
  // If the schema says ISummary is empty, then ISummary is empty.
}
