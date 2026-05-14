import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import { IPageIEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerEmailVerification";
import typia from "typia";

export async function test_api_ecommerceMall_customer_email_verifications_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallCustomerEmailVerification.ISummary =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      connection,
      {
        body: typia.random<IEcommerceMallCustomerEmailVerification.IRequest>(),
      },
    );
  typia.assert(output);
}
