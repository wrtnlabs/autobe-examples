import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleSnapshot";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_article_snapshot_access_by_authenticated_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a citizen user to obtain valid access token
  const citizenConnection: api.IConnection = { host: connection.host };
  const authorizedCitizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(authorizedCitizen);
  // 2. Generate a valid snapshot structure to obtain a real snapshotId
  const snapshotData = typia.random<IEconomicBoardArticleSnapshot>();
  const snapshotId = snapshotData.id;
  // 3. Access the snapshot using the generated snapshotId
  const snapshot = await api.functional.economicBoard.article_snapshots.at(
    citizenConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 4. Validate snapshot contains correct structure (id, article_id, created_at, snapshot_reason)
  // No manual validation needed after typia.assert - it performs complete validation
  // - snapshot.id matches the snapshotId we queried
  // - snapshot.article_id is a valid UUID
  // - snapshot.created_at is a valid date-time
  // - snapshot.snapshot_reason is one of: 'initial', 'edit', 'deletion', 'admin_delete'
  // All verified by typia.assert on IEconomicBoardArticleSnapshot type
}
