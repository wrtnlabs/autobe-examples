import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_subcategory_update_success(
  connection: api.IConnection,
): Promise<void> {
  const body = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformCategory.IUpdate;
  const output =
    await api.functional.mallPlatform.administrator.categories.subcategories.update(
      connection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        subcategoryId: typia.random<string & tags.Format<"uuid">>(),
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "updated name should match request",
    output.name,
    body.name,
  );
  TestValidator.equals(
    "updated description should match request",
    output.description,
    body.description,
  );
  TestValidator.equals(
    "subcategory parent relationship should remain intact",
    output.parentCategory?.id,
    output.parentCategoryId,
  );
  TestValidator.predicate(
    "subcategory should remain a direct child or root-representative response",
    () =>
      output.parentCategory === null ||
      output.parentCategory.id === output.parentCategoryId,
  );
}
