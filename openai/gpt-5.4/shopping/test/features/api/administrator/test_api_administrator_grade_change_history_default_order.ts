import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote } from "../../../generate/generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote";
import { prepare_random_shopping_mall_administrator_grade_change } from "../../../prepare/prepare_random_shopping_mall_administrator_grade_change";

export async function test_api_administrator_grade_change_history_default_order(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministrator = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdministrator);
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  const firstReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstCreated =
    await generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote(
      superAdministratorConnection,
      {
        params: {
          administratorId,
        },
        body: {
          reason: firstReason,
        } satisfies IShoppingMallAdministratorGradeChange.ICreate,
      },
    );
  typia.assert(firstCreated);
  const createdEvents: IShoppingMallAdministratorGradeChange[] = [firstCreated];
  const secondReason = RandomGenerator.paragraph({ sentences: 4 });
  try {
    const secondCreated =
      await generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote(
        superAdministratorConnection,
        {
          params: {
            administratorId,
          },
          body: {
            reason: secondReason,
          } satisfies IShoppingMallAdministratorGradeChange.ICreate,
        },
      );
    typia.assert(secondCreated);
    createdEvents.push(secondCreated);
  } catch {
    // Repeated promotion can be rejected after the first successful promotion.
  }
  const history =
    await api.functional.shoppingMall.superAdministrator.administrators.grade_changes.index(
      superAdministratorConnection,
      {
        administratorId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(history);
  const historyAgain =
    await api.functional.shoppingMall.superAdministrator.administrators.grade_changes.index(
      superAdministratorConnection,
      {
        administratorId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(historyAgain);
  TestValidator.equals("history read is immutable", history, historyAgain);
  TestValidator.equals(
    "pagination current page",
    history.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", history.pagination.limit, 100);
  TestValidator.predicate(
    "history contains created audit rows",
    createdEvents.every((event) =>
      ArrayUtil.has(history.data, (row) => row.id === event.id),
    ),
  );
  TestValidator.predicate(
    "created rows belong to requested administrator",
    createdEvents.every((event) => event.administrator.id === administratorId),
  );
  TestValidator.predicate(
    "history includes acting super administrator relation",
    history.data.every(
      (row) => row.superAdministrator.id === superAdministrator.id,
    ),
  );
  TestValidator.predicate(
    "history includes expected reason",
    history.data.some((row) => row.reason === firstCreated.reason),
  );
  for (let i = 0; i < history.data.length - 1; ++i) {
    TestValidator.predicate(
      `default order newest first ${i}`,
      new Date(history.data[i].created_at).getTime() >=
        new Date(history.data[i + 1].created_at).getTime(),
    );
  }
  if (createdEvents.length === 2) {
    const firstIndex = history.data.findIndex(
      (row) => row.id === createdEvents[0].id,
    );
    const secondIndex = history.data.findIndex(
      (row) => row.id === createdEvents[1].id,
    );
    TestValidator.predicate(
      "both created rows are present in history order check",
      firstIndex !== -1 && secondIndex !== -1,
    );
    if (
      new Date(createdEvents[1].created_at).getTime() >=
      new Date(createdEvents[0].created_at).getTime()
    ) {
      TestValidator.predicate(
        "newer created event appears earlier by default",
        secondIndex <= firstIndex,
      );
    } else {
      TestValidator.predicate(
        "older created event appears later by default",
        firstIndex <= secondIndex,
      );
    }
  }
}
