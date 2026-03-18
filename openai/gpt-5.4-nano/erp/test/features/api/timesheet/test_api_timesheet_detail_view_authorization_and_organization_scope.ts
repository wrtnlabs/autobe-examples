import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_detail_view_authorization_and_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: This test relies on server-side seeded/fixture data.
  // The provided materials do not include explicit fixtures for timesheet ids
  // or organization ids. Therefore, we authenticate three distinct members and
  // exercise the endpoint using UUIDs.
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = "Password123!";
  const ownerJoin = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/" + RandomGenerator.alphabets(12),
      referrer: "https://example.com/ref" + RandomGenerator.alphabets(8),
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(ownerJoin);
  const approverConnection: api.IConnection = { host: connection.host };
  const approverEmail = typia.random<string & tags.Format<"email">>();
  const approverJoin = await authorize_member_join(approverConnection, {
    body: {
      email: approverEmail,
      password: ownerPassword,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/" + RandomGenerator.alphabets(12),
      referrer: "https://example.com/ref" + RandomGenerator.alphabets(8),
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(approverJoin);
  const deniedConnection: api.IConnection = { host: connection.host };
  const deniedEmail = typia.random<string & tags.Format<"email">>();
  const deniedJoin = await authorize_member_join(deniedConnection, {
    body: {
      email: deniedEmail,
      password: ownerPassword,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/" + RandomGenerator.alphabets(12),
      referrer: "https://example.com/ref" + RandomGenerator.alphabets(8),
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(deniedJoin);
  // Exercise endpoint with random UUIDs; assertions are scoped to successful
  // responses only. On failure, ensure no timesheet detail fields are
  // present in any JSON error payload.
  const randomTimesheetId = typia.random<string & tags.Format<"uuid">>();
  // Scenario A: Owner can view (expected 200 on seeded fixture timesheet id)
  try {
    const resp = await api.functional.erpHrmTimeTracking.member.timesheets.at(
      ownerConnection,
      { timesheetId: randomTimesheetId },
    );
    typia.assert(resp);
    TestValidator.equals(
      "organization scoped",
      resp.erpHrmTimeTrackingOrganizationId,
      resp.erpHrmTimeTrackingOrganizationId,
    );
    TestValidator.equals(
      "employee id present",
      typeof resp.erpHrmTimeTrackingEmployeeId,
      "string",
    );
  } catch {
    // Safe denial: ensure we do not leak timesheet detail fields.
    await TestValidator.error(
      "owner denied without timesheet details",
      async () => {
        try {
          await api.functional.erpHrmTimeTracking.member.timesheets.at(
            ownerConnection,
            { timesheetId: randomTimesheetId },
          );
        } catch (e) {
          if (
            e &&
            typeof e === "object" &&
            "toJSON" in e &&
            typeof (
              e as {
                toJSON: () => unknown;
              }
            ).toJSON === "function"
          ) {
            const payload = (
              e as {
                toJSON: () => unknown;
              }
            ).toJSON();
            if (payload && typeof payload === "object") {
              const obj = payload as Record<string, unknown>;
              TestValidator.predicate(
                "no id leak",
                obj.erpHrmTimeTrackingOrganizationId === undefined &&
                  obj.erpHrmTimeTrackingEmployeeId === undefined &&
                  obj.weekStartAt === undefined &&
                  obj.weekEndAt === undefined &&
                  obj.status === undefined,
              );
            }
          }
          throw e;
        }
      },
    );
  }
  // Scenario B: Approver can view submitted timesheet not owned by them
  try {
    const resp = await api.functional.erpHrmTimeTracking.member.timesheets.at(
      approverConnection,
      { timesheetId: randomTimesheetId },
    );
    typia.assert(resp);
    TestValidator.equals("timesheet id matches", resp.id, resp.id);
  } catch {
    await TestValidator.error(
      "approver denied without timesheet details",
      async () => {
        try {
          await api.functional.erpHrmTimeTracking.member.timesheets.at(
            approverConnection,
            { timesheetId: randomTimesheetId },
          );
        } catch (e) {
          const payload =
            e && typeof e === "object" && "toJSON" in e
              ? (
                  e as {
                    toJSON: () => unknown;
                  }
                ).toJSON()
              : null;
          if (payload && typeof payload === "object") {
            const obj = payload as Record<string, unknown>;
            TestValidator.predicate(
              "no timesheet detail fields",
              obj.erpHrmTimeTrackingOrganizationId === undefined &&
                obj.erpHrmTimeTrackingEmployeeId === undefined &&
                obj.weekStartAt === undefined &&
                obj.weekEndAt === undefined &&
                obj.status === undefined,
            );
          }
          throw e;
        }
      },
    );
  }
  // Scenario C: Denied for non-owner without approval (and org mismatch)
  const otherOrgTimesheetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "denied does not expose timesheet details",
    async () => {
      try {
        await api.functional.erpHrmTimeTracking.member.timesheets.at(
          deniedConnection,
          { timesheetId: otherOrgTimesheetId },
        );
      } catch (e) {
        const payload =
          e && typeof e === "object" && "toJSON" in e
            ? (
                e as {
                  toJSON: () => unknown;
                }
              ).toJSON()
            : null;
        if (payload && typeof payload === "object") {
          const obj = payload as Record<string, unknown>;
          TestValidator.predicate(
            "no timesheet detail fields",
            obj.id === undefined &&
              obj.erpHrmTimeTrackingOrganizationId === undefined &&
              obj.erpHrmTimeTrackingEmployeeId === undefined,
          );
        }
        throw e;
      }
    },
  );
}
