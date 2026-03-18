import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Initialize guest access via authorize_guest_join utility
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmGuest.IJoin,
  });
  // Step 2: Test filtering by status="active"
  const activeResponse = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAfter: null,
        createdBefore: null,
        status: "active",
        ipPattern: null,
        referrerPattern: null,
        cursor: null,
        limit: 20,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(activeResponse);
  // Step 3: Verify only sessions with isActive=true are returned
  for (const session of activeResponse.data) {
    TestValidator.equals(
      `session ${session.id} should be active`,
      session.isActive,
      true,
    );
  }
  // Step 4: Test filtering by status="expired"
  const expiredResponse = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAfter: null,
        createdBefore: null,
        status: "expired",
        ipPattern: null,
        referrerPattern: null,
        cursor: null,
        limit: 20,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(expiredResponse);
  // Step 5: Verify only sessions with isActive=false are returned
  for (const session of expiredResponse.data) {
    TestValidator.equals(
      `session ${session.id} should be expired`,
      session.isActive,
      false,
    );
  }
  // Step 6: Test filtering by status="all"
  const allResponse = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAfter: null,
        createdBefore: null,
        status: "all",
        ipPattern: null,
        referrerPattern: null,
        cursor: null,
        limit: 20,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(allResponse);
  // Step 7: Verify combined results (all should contain at least what active and expired contain)
  const activeCount = activeResponse.data.length;
  const expiredCount = expiredResponse.data.length;
  const allCount = allResponse.data.length;
  TestValidator.equals(
    "all filter should return at least as many as active plus expired",
    allCount,
    activeCount + expiredCount,
  );
  // Verify all sessions returned with "all" filter have isActive correctly set
  for (const session of allResponse.data) {
    TestValidator.predicate(
      `session ${session.id} has valid isActive boolean`,
      typeof session.isActive === "boolean",
    );
  }
}
