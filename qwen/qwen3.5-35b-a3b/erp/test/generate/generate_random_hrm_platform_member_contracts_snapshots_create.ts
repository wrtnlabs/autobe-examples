import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_contracts_snapshot } from "../prepare/prepare_random_hrm_platform_contracts_snapshot";

/**
 * Generate a random contract snapshot for E2E testing.
 *
 * Creates an immutable point-in-time snapshot of an employment contract by calling the snapshot creation endpoint. ...
 */
export async function generate_random_hrm_platform_member_contracts_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformContractsSnapshot.ICreate> | undefined;
    params?: {
      contractId: string;
    };
  },
): Promise<IHrmPlatformContractsSnapshot> {
  const prepared: IHrmPlatformContractsSnapshot.ICreate =
    prepare_random_hrm_platform_contracts_snapshot(props.body);
  const result: IHrmPlatformContractsSnapshot =
    await api.functional.hrmPlatform.member.contracts.snapshots.create(
      connection,
      {
        body: prepared,
        contractId: (props.params?.contractId ?? "") satisfies string as string & tags.Format<"uuid">,
      },
    );
  return result;
}