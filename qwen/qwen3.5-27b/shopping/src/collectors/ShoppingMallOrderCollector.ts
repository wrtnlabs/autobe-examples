import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderCollector {
  export async function collect(props: {
    body: IShoppingMallOrder.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    // Query the actual customer record to get display_name and phone_number
    const customer =
      await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
        where: { id: props.shoppingMallCustomers.id },
        select: {
          display_name: true,
          phone_number: true,
        },
      });
    // Construct shipping address snapshot using customer data
    // Since shopping_mall_addresses table doesn't exist, we use customer info
    const shippingAddressSnapshot = JSON.stringify({
      recipientName: customer.display_name,
      phoneNumber: customer.phone_number ?? "",
      streetAddress: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      country: "",
    });
    // Total price should be calculated from cart items at higher level.
    // Using placeholder value here.
    const totalPrice = 0;
    return {
      id: v4(),
      shipping_address_snapshot: shippingAddressSnapshot,
      total_price: totalPrice,
      status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      orderItems: undefined,
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
