import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_search(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const searchConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const firstPage =
    await api.functional.hrmTimeTracking.member.email_verifications.index(
      searchConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IHrmTimeTrackingMemberEmailVerification.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current should be first page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "all records should belong to current member context",
    firstPage.data.every((item) => item.member.id === authorized.id),
  );
  TestValidator.predicate(
    "all records should have matching member email",
    firstPage.data.every((item) => item.member.email === authorized.email),
  );
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    const matchingPage =
      await api.functional.hrmTimeTracking.member.email_verifications.index(
        searchConnection,
        {
          body: {
            memberId: sample.member.id,
            email: sample.member.email,
            page: 1,
            limit: 10,
            sort: "-created_at",
          } satisfies IHrmTimeTrackingMemberEmailVerification.IRequest,
        },
      );
    typia.assert(matchingPage);
    TestValidator.predicate(
      "filtered page should still be scoped to current member",
      matchingPage.data.every((item) => item.member.id === authorized.id),
    );
    TestValidator.predicate(
      "filtered page should contain matching member email",
      matchingPage.data.every(
        (item) => item.member.email === sample.member.email,
      ),
    );
    TestValidator.predicate(
      "filtered result set should not be larger than unfiltered result set",
      matchingPage.pagination.records <= firstPage.pagination.records,
    );
    const emailParts = authorized.email.split("@");
    const emptyEmail = `no-match-${RandomGenerator.alphaNumeric(8)}@${emailParts[1] ?? "example.com"}`;
    const emptyPage =
      await api.functional.hrmTimeTracking.member.email_verifications.index(
        searchConnection,
        {
          body: {
            memberId: authorized.id,
            email: emptyEmail satisfies string & tags.Format<"email">,
            page: 1,
            limit: 10,
          } satisfies IHrmTimeTrackingMemberEmailVerification.IRequest,
        },
      );
    typia.assert(emptyPage);
    TestValidator.equals(
      "non-matching search should return empty data",
      emptyPage.data.length,
      0,
    );
    TestValidator.equals(
      "non-matching search should have zero records",
      emptyPage.pagination.records,
      0,
    );
  }
}
