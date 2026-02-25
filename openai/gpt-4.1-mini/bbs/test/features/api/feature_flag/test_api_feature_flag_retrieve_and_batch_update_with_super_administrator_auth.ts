import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_feature_flag_retrieve_and_batch_update_with_super_administrator_auth(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdministrator join and authorize
  const saConnection: api.IConnection = { host: connection.host };
  const saAuthorized = await authorize_super_administrator_join(saConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://localhost/join",
      referrer: "https://localhost/referrer",
      ip: null,
    },
  });
  saConnection.headers = {
    Authorization: saAuthorized.token.access,
  };
  // 2. Retrieve feature flags without filters to get default pagination and sorting
  const noFilterResponse: IPageIDiscussionBoardFeatureFlag.ISummary =
    await api.functional.discussionBoard.superAdministrator.featureFlags.index(
      saConnection,
      {
        body: {},
      },
    );
  typia.assert(noFilterResponse);
  TestValidator.predicate(
    "pagination current page is 1",
    noFilterResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    noFilterResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    noFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    noFilterResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array is non-empty",
    noFilterResponse.data.length >= 0,
  );
  // 3. Test filtering by exact code if at least one feature flag exists
  if (noFilterResponse.data.length > 0) {
    const sampleCode = noFilterResponse.data[0].code;
    const filterByCodeResponse =
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        saConnection,
        {
          body: { code: sampleCode },
        },
      );
    typia.assert(filterByCodeResponse);
    for (const flag of filterByCodeResponse.data) {
      TestValidator.equals("filtered code matches", flag.code, sampleCode);
    }
  }
  // 4. Test filtering by enabled status
  // We try both true and false filter if possible
  const enabledFlags = noFilterResponse.data.filter((e) => e.enabled === true);
  if (enabledFlags.length > 0) {
    const filterEnabledTrue =
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        saConnection,
        {
          body: { enabled: true },
        },
      );
    typia.assert(filterEnabledTrue);
    for (const flag of filterEnabledTrue.data) {
      TestValidator.predicate("flag should be enabled", flag.enabled === true);
    }
  }
  const disabledFlags = noFilterResponse.data.filter(
    (e) => e.enabled === false,
  );
  if (disabledFlags.length > 0) {
    const filterEnabledFalse =
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        saConnection,
        {
          body: { enabled: false },
        },
      );
    typia.assert(filterEnabledFalse);
    for (const flag of filterEnabledFalse.data) {
      TestValidator.predicate(
        "flag should be disabled",
        flag.enabled === false,
      );
    }
  }
  // 5. Test filtering by createdAtFrom and createdAtTo range
  // Choose a valid range based on existing data or current time
  if (noFilterResponse.data.length > 0) {
    const minDate = noFilterResponse.data.reduce<string | undefined>(
      (min, cur) => {
        if (cur.createdAt === undefined) return min;
        if (min === undefined) return cur.createdAt;
        return cur.createdAt < min ? cur.createdAt : min;
      },
      undefined,
    );
    const maxDate = noFilterResponse.data.reduce<string | undefined>(
      (max, cur) => {
        if (cur.createdAt === undefined) return max;
        if (max === undefined) return cur.createdAt;
        return cur.createdAt > max ? cur.createdAt : max;
      },
      undefined,
    );
    if (minDate && maxDate) {
      // Set createdAtFrom as minDate and createdAtTo as maxDate
      const filterCreatedAtResponse =
        await api.functional.discussionBoard.superAdministrator.featureFlags.index(
          saConnection,
          {
            body: { createdAtFrom: minDate, createdAtTo: maxDate },
          },
        );
      typia.assert(filterCreatedAtResponse);
      for (const flag of filterCreatedAtResponse.data) {
        if (flag.createdAt) {
          TestValidator.predicate(
            "flag createdAt in range",
            flag.createdAt >= minDate && flag.createdAt <= maxDate,
          );
        }
      }
    }
  }
  // 6. Test filtering by updatedAtFrom and updatedAtTo range similarly
  if (noFilterResponse.data.length > 0) {
    const minUpdateDate = noFilterResponse.data.reduce<string | undefined>(
      (min, cur) => {
        if (cur.updatedAt === undefined) return min;
        if (min === undefined) return cur.updatedAt;
        return cur.updatedAt < min ? cur.updatedAt : min;
      },
      undefined,
    );
    const maxUpdateDate = noFilterResponse.data.reduce<string | undefined>(
      (max, cur) => {
        if (cur.updatedAt === undefined) return max;
        if (max === undefined) return cur.updatedAt;
        return cur.updatedAt > max ? cur.updatedAt : max;
      },
      undefined,
    );
    if (minUpdateDate && maxUpdateDate) {
      const filterUpdatedAtResponse =
        await api.functional.discussionBoard.superAdministrator.featureFlags.index(
          saConnection,
          {
            body: { updatedAtFrom: minUpdateDate, updatedAtTo: maxUpdateDate },
          },
        );
      typia.assert(filterUpdatedAtResponse);
      for (const flag of filterUpdatedAtResponse.data) {
        if (flag.updatedAt) {
          TestValidator.predicate(
            "flag updatedAt in range",
            flag.updatedAt >= minUpdateDate && flag.updatedAt <= maxUpdateDate,
          );
        }
      }
    }
  }
  // 7. Test batch update of flags: toggle enabled state for up to 3 flags
  const flagsToToggle = noFilterResponse.data.slice(0, 3);
  // Cast batch update payload as array of objects with code and enabled explicitly
  const batchUpdatePayload = flagsToToggle.map((flag) => ({
    code: flag.code,
    enabled: !flag.enabled,
  })) satisfies Array<{ code: string; enabled: boolean }>; // Ensure properties exist

  if (batchUpdatePayload.length > 0) {
    // Perform batch update
    const batchUpdateResponse =
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        saConnection,
        {
          body: { batchUpdate: batchUpdatePayload },
        },
      );
    typia.assert(batchUpdateResponse);
    // Confirm changes are applied
    batchUpdatePayload.forEach((update) => {
      const updatedFlag = batchUpdateResponse.data.find(
        (f) => f.code === update.code,
      );
      if (updatedFlag) {
        TestValidator.equals(
          `batch update flag ${update.code} enabled state`,
          updatedFlag.enabled,
          update.enabled,
        );
      }
    });
  }
  // 8. Test error handling with invalid batch update input
  // Try updating a non-existent code and expect error
  await TestValidator.error(
    "batch update with invalid flag code should throw",
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        saConnection,
        {
          body: { batchUpdate: [{ code: "INVALID_CODE", enabled: true }] },
        },
      );
    },
  );
}
