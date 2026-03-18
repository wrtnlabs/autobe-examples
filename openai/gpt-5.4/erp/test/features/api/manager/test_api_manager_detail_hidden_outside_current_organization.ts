import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_manager_detail_hidden_outside_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const viewerConnection: api.IConnection = {
    host: connection.host,
  };
  const managerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "manager detail outside current organization is hidden",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.managers.at(viewerConnection, {
        managerId,
      });
    },
  );
}
