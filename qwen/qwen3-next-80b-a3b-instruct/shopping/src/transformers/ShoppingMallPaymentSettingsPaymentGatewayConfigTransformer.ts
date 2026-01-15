import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentSettingsPaymentGatewayConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayConfig";
import { IShoppingMallPaymentSettingsPaymentGatewayStripe } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayStripe";
import { IShoppingMallPaymentSettingsPaymentGatewayPayPal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayPayPal";
import { IShoppingMallPaymentSettingsPaymentGatewaySquare } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewaySquare";
import { IShoppingMallPaymentSettingsPaymentGatewayBankTransfer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayBankTransfer";
import { IShoppingMallPaymentSettingsPaymentGatewayCryptocurrency } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentGatewayCryptocurrency";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentSettingsPaymentGatewayConfigTransformer {
  export type Payload = Prisma.shopping_mall_payment_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        payment_timeout_seconds: true,
        max_retry_attempts: true,
        sla_threshold_minutes: true,
        disable_card_payments: true,
        disable_wallet_payments: true,
        disable_crypto_payments: true,
        enable_surcharge: true,
        enable_rate_limiting: true,
        enable_webhooks: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentSettingsPaymentGatewayConfig> {
    return {
      stripe: input.disable_card_payments ? undefined : "",
      paypal: input.disable_wallet_payments
        ? undefined
        : {
            clientId: "",
            clientSecret: "",
            sandboxMode: false,
            webhookId: undefined,
            paymentIntentMode: undefined,
            currency: undefined,
            enableExpressCheckout: undefined,
            enableInvoicing: undefined,
          },
      square: input.disable_wallet_payments ? undefined : "",
      bank_transfer: input.disable_wallet_payments ? undefined : "",
      cryptocurrency: input.disable_crypto_payments
        ? undefined
        : {
            accepted_currencies: [],
            wallet_address: "",
            conversion_service: "Coinbase",
            network: "mainnet",
            confirmation_threshold: 1,
            transaction_fee: "customer",
            reconciliation_delay_minutes: 15,
            conversion_rate_refresh_minutes: 10,
            input_address_prefix: "",
            private_key_storage_method: "cold_storage",
            send_to_address: "",
            manage_orders: false,
            auto_refund_enabled: false,
          },
    };
  }
}
