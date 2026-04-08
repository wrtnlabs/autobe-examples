import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_access_control(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access should be rejected",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.emailVerifications.index(
        unauthorizedConnection,
        {
          body: {
            page: 1,
            limit: 1,
          } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
        },
      );
    },
  );
  const firstPage =
    await api.functional.erpHrmTime.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          sort: "-createdAt",
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 1);
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data length within limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "first page summaries omit secret token",
    firstPage.data.every((record) => !("token" in record)),
  );
  const secondPage =
    await api.functional.erpHrmTime.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          sort: "-createdAt",
          page: 2,
          limit: 1,
        } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 1);
  TestValidator.predicate(
    "second page data length within limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  TestValidator.predicate(
    "second page summaries omit secret token",
    secondPage.data.every((record) => !("token" in record)),
  );
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "later page should not duplicate the first item when paging is applied",
      firstPage.data[0].id,
      secondPage.data[0].id,
    );
  }
  const filteredPage =
    await api.functional.erpHrmTime.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          memberId: memberConnection.headers?.Authorization
            ? typia.random<string & tags.Format<"uuid">>()
            : undefined,
          sort: "-createdAt",
          page: 1,
          limit: 2,
        } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered page summaries omit secret token",
    filteredPage.data.every((record) => !("token" in record)),
  );
}
