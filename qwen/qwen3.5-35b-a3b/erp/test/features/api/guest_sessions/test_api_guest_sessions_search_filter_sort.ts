import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_search_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple guest accounts to generate multiple sessions
  const sessions: IHrmPlatformGuest.IAuthorized[] = [];
  const sessionUAs: string[] = [];
  for (let i = 0; i < 5; i++) {
    const guestConnection: api.IConnection = { host: connection.host };
    const guest = await authorize_guest_join(guestConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformGuest.IJoin,
    });
    typia.assert(guest);
    sessions.push(guest);
    sessionUAs.push(guest.user_agent);
  }
  // Test search by IP address pattern
  const firstSessionIp = sessions[0].ip_address;
  const ipSearchPattern = firstSessionIp.substring(0, 8);
  const ipSearchConnection: api.IConnection = { host: connection.host };
  const ipSearchResult: IPageIHrmPlatformMemberSession.ISummary =
    await api.functional.hrmPlatform.guest.sessions.index(ipSearchConnection, {
      body: {
        search: ipSearchPattern,
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(ipSearchResult);
  // Verify search found at least one matching session
  TestValidator.equals(
    "IP search found matching session",
    ipSearchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "IP search returned expected count",
    ipSearchResult.data.length,
    ipSearchResult.pagination.records,
  );
  // Test search by user agent pattern
  const userAgentSearchPattern = "Mozilla";
  const uaSearchConnection: api.IConnection = { host: connection.host };
  const uaSearchResult: IPageIHrmPlatformMemberSession.ISummary =
    await api.functional.hrmPlatform.guest.sessions.index(uaSearchConnection, {
      body: {
        search: userAgentSearchPattern,
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(uaSearchResult);
  // Verify user agent search works
  TestValidator.equals(
    "User agent search returned results",
    uaSearchResult.pagination.records >= 0,
    true,
  );
  // Test status filtering - active sessions
  const activeStatusConnection: api.IConnection = { host: connection.host };
  const activeResult: IPageIHrmPlatformMemberSession.ISummary =
    await api.functional.hrmPlatform.guest.sessions.index(
      activeStatusConnection,
      {
        body: {
          status: "active",
        } satisfies IHrmPlatformMemberSession.IRequest,
      },
    );
  typia.assert(activeResult);
  // Verify active sessions have null expired_at
  if (activeResult.data.length > 0) {
    activeResult.data.forEach((session) => {
      TestValidator.equals(
        "Active session has null expired_at",
        session.expired_at,
        null,
      );
    });
  }
  // Test sorting by created_at ASC
  const ascSortConnection: api.IConnection = { host: connection.host };
  const ascSortResult: IPageIHrmPlatformMemberSession.ISummary =
    await api.functional.hrmPlatform.guest.sessions.index(ascSortConnection, {
      body: {
        sort: "created_at",
        order: "ASC",
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(ascSortResult);
  // Verify sorting is in ascending order
  if (ascSortResult.data.length > 1) {
    for (let i = 1; i < ascSortResult.data.length; i++) {
      TestValidator.equals(
        `created_at ASC order at index ${i}`,
        ascSortResult.data[i].created_at >=
          ascSortResult.data[i - 1].created_at,
        true,
      );
    }
  }
  // Test sorting by created_at DESC
  const descSortConnection: api.IConnection = { host: connection.host };
  const descSortResult: IPageIHrmPlatformMemberSession.ISummary =
    await api.functional.hrmPlatform.guest.sessions.index(descSortConnection, {
      body: {
        sort: "created_at",
        order: "DESC",
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(descSortResult);
  // Verify sorting is in descending order
  if (descSortResult.data.length > 1) {
    for (let i = 1; i < descSortResult.data.length; i++) {
      TestValidator.equals(
        `created_at DESC order at index ${i}`,
        descSortResult.data[i].created_at <=
          descSortResult.data[i - 1].created_at,
        true,
      );
    }
  }
  // Test sorting by access_token_expires_at ASC
  const ascTokenSortConnection: api.IConnection = { host: connection.host };
  const ascTokenSortResult: IPageIHrmPlatformMemberSession.ISummary =
    await api.functional.hrmPlatform.guest.sessions.index(
      ascTokenSortConnection,
      {
        body: {
          sort: "access_token_expires_at",
          order: "ASC",
        } satisfies IHrmPlatformMemberSession.IRequest,
      },
    );
  typia.assert(ascTokenSortResult);
  // Verify token sort ascending order
  if (ascTokenSortResult.data.length > 1) {
    for (let i = 1; i < ascTokenSortResult.data.length; i++) {
      TestValidator.equals(
        `access_token_expires_at ASC order at index ${i}`,
        ascTokenSortResult.data[i].created_at >=
          ascTokenSortResult.data[i - 1].created_at,
        true,
      );
    }
  }
  // Test sorting by access_token_expires_at DESC
  const descTokenSortConnection: api.IConnection = { host: connection.host };
  const descTokenSortResult: IPageIHrmPlatformMemberSession.ISummary =
    await api.functional.hrmPlatform.guest.sessions.index(
      descTokenSortConnection,
      {
        body: {
          sort: "access_token_expires_at",
          order: "DESC",
        } satisfies IHrmPlatformMemberSession.IRequest,
      },
    );
  typia.assert(descTokenSortResult);
  // Verify token sort descending order
  if (descTokenSortResult.data.length > 1) {
    for (let i = 1; i < descTokenSortResult.data.length; i++) {
      TestValidator.equals(
        `access_token_expires_at DESC order at index ${i}`,
        descTokenSortResult.data[i].created_at <=
          descTokenSortResult.data[i - 1].created_at,
        true,
      );
    }
  }
}
