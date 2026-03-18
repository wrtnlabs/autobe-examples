import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contracts_list_soft_deleted_include_deleted_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member (join)
  const baseMemberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const organizationCurrencyCode = RandomGenerator.alphabets(3);
  const joinPayload = {
    email,
    password,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode,
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(baseMemberConnection, {
    body: joinPayload,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  // 2) Find at least one active and one soft-deleted contract
  const pageLimit = 50 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const includeDeletedScan =
    await api.functional.erpHrmTimeTracking.member.contracts.index(
      memberConnection,
      {
        body: {
          includeDeleted: true,
          limit: pageLimit,
          page: 1,
        } satisfies IErpHrmTimeTrackingContract.IRequest,
      },
    );
  typia.assert(includeDeletedScan);
  let activeContract: IErpHrmTimeTrackingContract.ISummary | undefined;
  let retiredContract: IErpHrmTimeTrackingContract.ISummary | undefined;
  for (const c of includeDeletedScan.data) {
    if (c.deleted_at === null) activeContract ??= c;
    if (c.deleted_at !== null) retiredContract ??= c;
    if (activeContract && retiredContract) break;
  }
  TestValidator.predicate(
    "organization has at least one active contract",
    () => activeContract !== undefined,
  );
  TestValidator.predicate(
    "organization has at least one soft-deleted contract",
    () => retiredContract !== undefined,
  );
  // 3) Call PATCH without includeDeleted (use includeDeleted=null)
  const sameRequest = {
    includeDeleted: null,
    limit: pageLimit,
    page: 1,
  } satisfies IErpHrmTimeTrackingContract.IRequest;
  const defaultCall =
    await api.functional.erpHrmTimeTracking.member.contracts.index(
      memberConnection,
      {
        body: sameRequest,
      },
    );
  typia.assert(defaultCall);
  TestValidator.predicate("default call excludes soft-deleted contracts", () =>
    defaultCall.data.every((c) => c.deleted_at === null),
  );
  // 5) Call PATCH again with includeDeleted=true
  const includeDeletedCall =
    await api.functional.erpHrmTimeTracking.member.contracts.index(
      memberConnection,
      {
        body: {
          ...sameRequest,
          includeDeleted: true,
        } satisfies IErpHrmTimeTrackingContract.IRequest,
      },
    );
  typia.assert(includeDeletedCall);
  TestValidator.predicate(
    "includeDeleted call contains the known retired contract",
    () =>
      includeDeletedCall.data.some(
        (c) => c.id === retiredContract!.id && c.deleted_at !== null,
      ),
  );
  // 6) pagination.records should non-decrease
  TestValidator.predicate(
    "pagination.records non-decreases when includeDeleted=true",
    () =>
      includeDeletedCall.pagination.records >= defaultCall.pagination.records,
  );
}
