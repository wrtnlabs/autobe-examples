import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_authorization_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "member sessions requires authorization",
    401,
    async () => {
      await api.functional.erpHrmTime.member.sessions.index(
        anonymousConnection,
        {
          body: {} satisfies IErpHrmTimeMemberSession.IRequest,
        },
      );
    },
  );
  const email = `${RandomGenerator.alphabets(12)}@test.com`;
  const password = `Aa1!${RandomGenerator.alphaNumeric(12)}`;
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/member/sessions",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const isSorted = <T,>(
    items: readonly T[],
    selector: (item: T) => string,
    order: "asc" | "desc",
  ): boolean => {
    for (let i = 1; i < items.length; i++) {
      const prev = selector(items[i - 1]);
      const curr = selector(items[i]);
      if (order === "asc") {
        if (prev > curr) return false;
      } else {
        if (prev < curr) return false;
      }
    }
    return true;
  };
  const ascCreated = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        sort: "createdAt",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(ascCreated);
  const descCreated = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        sort: "createdAt",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(descCreated);
  const ascExpired = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        sort: "expiredAt",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(ascExpired);
  const descExpired = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        sort: "expiredAt",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(descExpired);
  TestValidator.predicate(
    "sessions sorted by createdAt asc",
    isSorted(ascCreated.data, (item) => item.created_at, "asc"),
  );
  TestValidator.predicate(
    "sessions sorted by createdAt desc",
    isSorted(descCreated.data, (item) => item.created_at, "desc"),
  );
  TestValidator.predicate(
    "sessions sorted by expiredAt asc",
    isSorted(ascExpired.data, (item) => item.expired_at, "asc"),
  );
  TestValidator.predicate(
    "sessions sorted by expiredAt desc",
    isSorted(descExpired.data, (item) => item.expired_at, "desc"),
  );
  TestValidator.equals(
    "pagination current page",
    ascCreated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", ascCreated.pagination.limit, 10);
}
