import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_email_verifications_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCustomerEmailVerification =
    await api.functional.ecommerceMall.customer.email_verifications.at(
      connection,
      {
        verificationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
