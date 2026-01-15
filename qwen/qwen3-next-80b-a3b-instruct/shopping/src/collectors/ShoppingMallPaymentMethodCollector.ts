import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallPaymentMethodBillingInterval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodBillingInterval";
import { IShoppingMallPaymentMethodCustomerIdRequirement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodCustomerIdRequirement";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentMethodCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentMethod.ICreate;
  }) {
    return {
      id: v4(),
      name: props.body.gatewayId,
      type: "payment_gateway",
      description: props.body.marketingDescription ?? null,
      enabled: true,
      supported_currencies: JSON.stringify(props.body.supportedCurrencies),
      regions: JSON.stringify(props.body.enabledRegions),
      configuration: JSON.stringify({
        feePercentage: props.body.feePercentage,
        feeFixedAmount: props.body.feeFixedAmount,
        requires3DSecure: props.body.requires3DSecure,
        maxAmount: props.body.maxAmount,
        minAmount: props.body.minAmount,
        experimental: props.body.experimental,
        onboardingUrl: props.body.onboardingUrl,
        businessClassification: props.body.businessClassification,
        autoRefundEnabled: props.body.autoRefundEnabled,
        negotiatedRateOverride: props.body.negotiatedRateOverride,
        settlementDays: props.body.settlementDays,
        primaryForRegion: props.body.primaryForRegion,
        refundUrl: props.body.refundUrl,
        supportsPartialCapture: props.body.supportsPartialCapture,
        authExpiryHours: props.body.authExpiryHours,
        supportsRecurring: props.body.supportsRecurring,
        intervalBillingSupport: props.body.intervalBillingSupport,
        customerIdRequirement: props.body.customerIdRequirement,
        documentationUrl: props.body.documentationUrl,
      }),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_payment_methodsCreateInput;
  }
}
