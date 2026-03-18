import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOwnerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_session_browse_owner_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  const firstPage = await api.functional.hrmTimeTracking.owner.sessions.index(
    ownerConnection,
    {
      body: {} satisfies IHrmTimeTrackingOwnerSession.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page data length does not exceed pagination limit",
    firstPage.pagination.limit === 0 ||
      firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "empty pages imply empty data",
    firstPage.pagination.pages !== 0 || firstPage.data.length === 0,
  );
  TestValidator.predicate(
    "empty pages are consistent with zero records or empty data",
    firstPage.pagination.pages !== 0 ||
      firstPage.pagination.records === 0 ||
      firstPage.data.length === 0,
  );
  if (firstPage.data.length > 0) {
    const organizationId = firstPage.data[0].organization.id;
    for (const session of firstPage.data) {
      TestValidator.equals(
        "session owner id matches authenticated owner",
        session.owner.id,
        joined.id,
      );
      TestValidator.equals(
        "session owner email matches authenticated owner",
        session.owner.email,
        joined.email,
      );
      TestValidator.equals(
        "session organization id matches first visible organization scope",
        session.organization.id,
        organizationId,
      );
      TestValidator.predicate("session expires after creation", () => {
        const created = Date.parse(session.created_at);
        const expired = Date.parse(session.expired_at);
        return (
          Number.isFinite(created) &&
          Number.isFinite(expired) &&
          expired >= created
        );
      });
    }
  }
  for (let i = 1; i < firstPage.data.length; ++i) {
    TestValidator.predicate("default order is newest created_at first", () => {
      const previous = Date.parse(firstPage.data[i - 1].created_at);
      const current = Date.parse(firstPage.data[i].created_at);
      return (
        Number.isFinite(previous) &&
        Number.isFinite(current) &&
        previous >= current
      );
    });
  }
  const secondPage = await api.functional.hrmTimeTracking.owner.sessions.index(
    ownerConnection,
    {
      body: {} satisfies IHrmTimeTrackingOwnerSession.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination metadata remains stable across repeated reads",
    secondPage.pagination,
    firstPage.pagination,
  );
  TestValidator.equals(
    "repeated read preserves data length",
    secondPage.data.length,
    firstPage.data.length,
  );
  TestValidator.equals(
    "repeated read preserves returned session id order",
    secondPage.data.map((session) => session.id),
    firstPage.data.map((session) => session.id),
  );
}
