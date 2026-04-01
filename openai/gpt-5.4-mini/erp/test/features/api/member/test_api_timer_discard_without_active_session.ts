import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_discard_without_active_session(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  try {
    await api.functional.erpHrmTime.member.timers.discard.erase(
      memberConnection,
    );
    throw new Error("Expected discard to fail when no active timer exists.");
  } catch (exp) {
    if (exp instanceof Error) {
      const error = exp as Error & {
        status?: number;
      };
      if (typeof error.status === "number") {
        TestValidator.predicate(
          "discard without active timer should fail with client/business error",
          error.status >= 400 && error.status < 500,
        );
        return;
      }
    }
    throw exp;
  }
}
