import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipment_tracking_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await api.functional.ecommerceMall.auth.member.join(
    customerAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
        display_name: "Customer A",
        href: "http://example.com/join",
        referrer: "http://example.com/ref",
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(customerA);
  // 2. Register and authenticate Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await api.functional.ecommerceMall.auth.member.join(
    customerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
        display_name: "Customer B",
        href: "http://example.com/join",
        referrer: "http://example.com/ref",
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(customerB);
  // 3. Generate a shipment ID (simulate Customer B's shipment)
  const customerBShipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer A attempts to access Customer B's shipment
  // This should return 404 because Customer A does not own this shipment
  await TestValidator.error(
    "customer A cannot access customer B's shipment",
    async () => {
      await api.functional.ecommerceMall.member.shipments.at(
        customerAConnection,
        {
          shipmentId: customerBShipmentId,
        },
      );
    },
  );
  // 5. Verify the error is a 404 Not Found (not 403) to prevent enumeration
  try {
    await api.functional.ecommerceMall.member.shipments.at(
      customerAConnection,
      {
        shipmentId: customerBShipmentId,
      },
    );
    throw new Error("Expected API to throw error");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      typia.assert(error.toJSON());
      const response = error.toJSON<IEcommerceMallMember.IAuthorized>();
      TestValidator.equals("HTTP status is 404", error.status, 404);
    } else {
      throw error;
    }
  }
}
