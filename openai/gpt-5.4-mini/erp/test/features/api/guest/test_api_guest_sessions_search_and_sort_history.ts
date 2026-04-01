import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_search_and_sort_history(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      href: `https://example.com/guest/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://referrer.example.com/${RandomGenerator.alphaNumeric(8)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      email: typia.random<string & tags.Format<"email">>(),
      token: RandomGenerator.alphaNumeric(16),
      invitationCode: RandomGenerator.alphaNumeric(12),
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  typia.assert(authorized);
  const first = await api.functional.erpHrmTime.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(first);
  TestValidator.predicate(
    "guest session history should have at least one record",
    first.data.length > 0,
  );
  TestValidator.predicate(
    "guest session history pagination should be valid",
    first.pagination.records >= first.data.length,
  );
  const sample = first.data[0]!;
  const searchField =
    sample.ip.length > 0
      ? sample.ip
      : sample.href.length > 0
        ? sample.href
        : sample.referrer;
  const searchResult = await api.functional.erpHrmTime.guest.sessions.index(
    guestConnection,
    {
      body: {
        search: searchField,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search should return at least one matching session",
    searchResult.data.length > 0,
  );
  for (const session of searchResult.data) {
    TestValidator.predicate(
      "search results must match the chosen field",
      session.ip.includes(searchField) ||
        session.href.includes(searchField) ||
        session.referrer.includes(searchField),
    );
  }
  const sortFields = ["created_at", "ip", "href", "referrer"] as const;
  for (const sort of sortFields) {
    const asc = await api.functional.erpHrmTime.guest.sessions.index(
      guestConnection,
      {
        body: {
          sort,
          order: "asc",
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeMemberSession.IRequest,
      },
    );
    typia.assert(asc);
    const desc = await api.functional.erpHrmTime.guest.sessions.index(
      guestConnection,
      {
        body: {
          sort,
          order: "desc",
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeMemberSession.IRequest,
      },
    );
    typia.assert(desc);
    TestValidator.equals(
      `session sort ${sort} asc record count`,
      asc.pagination.records,
      desc.pagination.records,
    );
    TestValidator.equals(
      `session sort ${sort} asc page size`,
      asc.data.length,
      desc.data.length,
    );
    const fieldValue = (session: IErpHrmTimeMemberSession.ISummary): string => {
      if (sort === "created_at") return session.createdAt;
      if (sort === "ip") return session.ip;
      if (sort === "href") return session.href;
      return session.referrer;
    };
    const ascExpected = [...asc.data].sort((x, y) => {
      const left = fieldValue(x);
      const right = fieldValue(y);
      return left < right ? -1 : left > right ? 1 : 0;
    });
    const descExpected = [...desc.data].sort((x, y) => {
      const left = fieldValue(x);
      const right = fieldValue(y);
      return left < right ? 1 : left > right ? -1 : 0;
    });
    TestValidator.equals(
      `session sort ${sort} ascending order`,
      asc.data,
      ascExpected,
    );
    TestValidator.equals(
      `session sort ${sort} descending order`,
      desc.data,
      descExpected,
    );
  }
}
