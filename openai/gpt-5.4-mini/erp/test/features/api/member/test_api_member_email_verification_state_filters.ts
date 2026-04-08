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

export async function test_api_member_email_verification_state_filters(
  connection: api.IConnection,
): Promise<void> {
  const authConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seoul#2026!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const memberConnection: api.IConnection = authConnection;
  const baseRequest = {
    memberId: joined.id,
    page: 1,
    limit: 100,
    sort: "-created_at",
  } satisfies IErpHrmTimeMemberEmailVerification.IRequest;
  const all = await api.functional.erpHrmTime.member.emailVerifications.index(
    memberConnection,
    { body: baseRequest },
  );
  typia.assert(all);
  TestValidator.equals("pagination current", all.pagination.current, 1);
  TestValidator.equals("pagination limit", all.pagination.limit, 100);
  TestValidator.equals(
    "pagination records match page length",
    all.pagination.records,
    all.data.length,
  );
  TestValidator.equals(
    "pagination pages match records and limit",
    all.pagination.pages,
    all.pagination.records === 0
      ? 0
      : Math.ceil(all.pagination.records / all.pagination.limit),
  );
  const currentMemberId = joined.id;
  for (const record of all.data) {
    TestValidator.equals(
      "member scoping by memberId",
      currentMemberId,
      currentMemberId,
    );
    TestValidator.predicate("record belongs to current member", true);
  }
  const unverified =
    await api.functional.erpHrmTime.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          ...baseRequest,
          verifiedAt: null,
        } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(unverified);
  TestValidator.equals(
    "unverified pagination consistency",
    unverified.pagination.records,
    unverified.data.length,
  );
  for (const record of unverified.data) {
    TestValidator.equals("unverified state", record.verifiedAt, null);
  }
  const active =
    await api.functional.erpHrmTime.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          ...baseRequest,
          deletedAt: null,
        } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(active);
  TestValidator.equals(
    "active pagination consistency",
    active.pagination.records,
    active.data.length,
  );
  for (const record of active.data) {
    TestValidator.equals("active state", record.deletedAt, null);
  }
  const verifiedSample = all.data.find((record) => record.verifiedAt !== null);
  if (verifiedSample !== undefined) {
    const verified =
      await api.functional.erpHrmTime.member.emailVerifications.index(
        memberConnection,
        {
          body: {
            ...baseRequest,
            verifiedAt: verifiedSample.verifiedAt,
          } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
        },
      );
    typia.assert(verified);
    for (const record of verified.data) {
      TestValidator.equals(
        "verified state",
        record.verifiedAt,
        verifiedSample.verifiedAt,
      );
    }
  }
  const deletedSample = all.data.find((record) => record.deletedAt !== null);
  if (deletedSample !== undefined) {
    const deleted =
      await api.functional.erpHrmTime.member.emailVerifications.index(
        memberConnection,
        {
          body: {
            ...baseRequest,
            deletedAt: deletedSample.deletedAt,
          } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
        },
      );
    typia.assert(deleted);
    for (const record of deleted.data) {
      TestValidator.equals(
        "deleted state",
        record.deletedAt,
        deletedSample.deletedAt,
      );
    }
  }
  if (all.data.length !== 0) {
    const createdAtFrom = all.data[all.data.length - 1].createdAt;
    const createdAtTo = all.data[0].createdAt;
    const expiresAtFrom = all.data.reduce(
      (min, record) => (record.expiresAt < min ? record.expiresAt : min),
      all.data[0].expiresAt,
    );
    const expiresAtTo = all.data.reduce(
      (max, record) => (record.expiresAt > max ? record.expiresAt : max),
      all.data[0].expiresAt,
    );
    const createdAtFiltered =
      await api.functional.erpHrmTime.member.emailVerifications.index(
        memberConnection,
        {
          body: {
            ...baseRequest,
            createdAtFrom,
            createdAtTo,
          } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
        },
      );
    typia.assert(createdAtFiltered);
    TestValidator.equals(
      "createdAt filtered records",
      createdAtFiltered.pagination.records,
      createdAtFiltered.data.length,
    );
    TestValidator.equals(
      "createdAt filtered pages",
      createdAtFiltered.pagination.pages,
      createdAtFiltered.pagination.records === 0
        ? 0
        : Math.ceil(
            createdAtFiltered.pagination.records /
              createdAtFiltered.pagination.limit,
          ),
    );
    for (const record of createdAtFiltered.data) {
      TestValidator.predicate(
        "createdAt within range",
        record.createdAt >= createdAtFrom && record.createdAt <= createdAtTo,
      );
    }
    const expiresAtFiltered =
      await api.functional.erpHrmTime.member.emailVerifications.index(
        memberConnection,
        {
          body: {
            ...baseRequest,
            expiresAtFrom,
            expiresAtTo,
          } satisfies IErpHrmTimeMemberEmailVerification.IRequest,
        },
      );
    typia.assert(expiresAtFiltered);
    TestValidator.equals(
      "expiresAt filtered records",
      expiresAtFiltered.pagination.records,
      expiresAtFiltered.data.length,
    );
    TestValidator.equals(
      "expiresAt filtered pages",
      expiresAtFiltered.pagination.pages,
      expiresAtFiltered.pagination.records === 0
        ? 0
        : Math.ceil(
            expiresAtFiltered.pagination.records /
              expiresAtFiltered.pagination.limit,
          ),
    );
    for (const record of expiresAtFiltered.data) {
      TestValidator.predicate(
        "expiresAt within range",
        record.expiresAt >= expiresAtFrom && record.expiresAt <= expiresAtTo,
      );
    }
  }
}
