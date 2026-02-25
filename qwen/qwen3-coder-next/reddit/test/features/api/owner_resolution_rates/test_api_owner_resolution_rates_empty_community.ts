import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_resolution_rates_empty_community(
  connection: api.IConnection,
): Promise<void> {
  // Register an owner to authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // Get resolution rates for empty community (no reports)
  const resolutionRates =
    await api.functional.redditClone.owner.analytics.resolution_rates.resolutionRates(
      ownerConnection,
    );
  typia.assert(resolutionRates);
  // Validate empty report dataset handling
  TestValidator.equals("total reports is 0", resolutionRates.totalReports, 0);
  TestValidator.equals(
    "resolved reports is 0",
    resolutionRates.resolvedReports,
    0,
  );
  TestValidator.equals(
    "pending reports is 0",
    resolutionRates.pendingReports,
    0,
  );
  TestValidator.equals("approval rate is 0", resolutionRates.approvalRate, 0);
  TestValidator.equals("dismissal rate is 0", resolutionRates.dismissalRate, 0);
  TestValidator.equals(
    "average resolution time is 0",
    resolutionRates.averageResolutionTimeMinutes,
    0,
  );
  TestValidator.equals(
    "resolution history is empty",
    resolutionRates.resolutionHistory?.length,
    0,
  );
}
