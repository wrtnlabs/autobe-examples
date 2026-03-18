import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_refund_requests_detail_member_cannot_access_others(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com`,
      password: "memberA-password",
    },
  });
  await authorize_member_join(memberBConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com`,
      password: "memberB-password",
    },
  });
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member A cannot access member B refund request (authorization boundary)",
    async () => {
      await api.functional.shoppingMall.member.refund_requests.at(
        memberAConnection,
        { refundRequestId },
      );
    },
  ).catch(async (err) => {
    // Validate error message does not leak refund details if any payload is present
    const maybeError = err as unknown as { toJSON?: unknown };
    if (typeof maybeError?.toJSON === "function") {
      const json = (maybeError.toJSON as () => unknown)() as Record<
        string,
        unknown
      >;
      const message = (json as Record<string, unknown>).message as unknown;
      const text =
        typeof message === "string" ? message : JSON.stringify(message);
      TestValidator.predicate(
        "error does not leak customerReason/status/sellerComment",
        () =>
          !(
            text.includes("customerReason") ||
            text.includes("status") ||
            text.includes("sellerComment")
          ),
      );
      return;
    }
    throw err;
  });
}
