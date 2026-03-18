import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_manager_detail_visible_in_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = {
    host: connection.host,
  };
  const managerId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.hrmTimeTracking.managers.at(
    managerConnection,
    {
      managerId,
    },
  );
  typia.assertEquals<IHrmTimeTrackingManager>(response);
  TestValidator.equals(
    "manager id matches requested id",
    response.id,
    managerId,
  );
  TestValidator.predicate("email is non-empty", response.email.length > 0);
  TestValidator.predicate(
    "deleted_at is nullable lifecycle value",
    response.deleted_at === null || response.deleted_at.length > 0,
  );
}
