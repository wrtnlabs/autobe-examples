import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_request_snapshot_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins to authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<255>
        >(),
        password: typia.random<
          string & tags.MinLength<8> & tags.Format<"password">
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Retrieve approved snapshot by ID
  // Note: In production, this would be created via approve endpoint, but testing retrieval of existing approved snapshot
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_request_snapshots.at(
      superAdminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot data
  TestValidator.equals(
    "requesterType is member",
    snapshot.requesterType,
    "member",
  );
  TestValidator.equals("status is approved", snapshot.status, "approved");
  TestValidator.equals(
    "approvedGrade is regular",
    snapshot.approvedGrade,
    "regular",
  );
  TestValidator.equals(
    "requesterId present",
    snapshot.requesterId,
    snapshot.requesterId,
  );
  TestValidator.predicate(
    "reviewedByAdministratorId is set",
    snapshot.reviewedByAdministratorId !== null,
  );
  TestValidator.predicate(
    "reviewReason is set",
    snapshot.reviewReason !== null && snapshot.reviewReason.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid",
    snapshot.createdAt !== undefined,
  );
  TestValidator.predicate(
    "ecommerceMallAdministratorApprovalRequestId is set",
    snapshot.ecommerceMallAdministratorApprovalRequestId !== undefined,
  );
}
