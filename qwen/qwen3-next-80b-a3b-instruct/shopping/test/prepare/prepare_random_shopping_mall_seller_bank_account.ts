import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerBankAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBankAccount";
export function prepare_random_shopping_mall_seller_bank_account(
  input?: DeepPartial<IShoppingMallSellerBankAccount.ICreate> | undefined,
): IShoppingMallSellerBankAccount.ICreate {
  return {
    bank_name:
      input?.bank_name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }) +
        " Bank",
    account_number:
      input?.account_number ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<12> & tags.Maximum<16>
        >(),
      ),
    routing_number:
      input?.routing_number ??
      typia.random<
        string & tags.MinLength<7> & tags.MaxLength<15> & tags.Pattern<"^\\d+$">
      >(),
    account_holder_name: input?.account_holder_name ?? RandomGenerator.name(),
    currency:
      input?.currency ??
      RandomGenerator.pick(["USD", "EUR", "GBP", "JPY", "KRW"] as const),
    country_code:
      input?.country_code ??
      RandomGenerator.pick(["US", "KR", "JP", "DE", "UK", "CA", "AU"] as const),
    branch_code:
      input?.branch_code ??
      (typia.random<number>() % 2 === 0
        ? RandomGenerator.alphaNumeric(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<8>
            >(),
          )
        : undefined),
    iban:
      input?.iban ??
      (["KR", "DE", "FR", "IT", "ES", "NL", "BE"].includes(
        input?.country_code ??
          RandomGenerator.pick([
            "KR",
            "DE",
            "FR",
            "IT",
            "ES",
            "NL",
            "BE",
          ] as const),
      )
        ? "KR" +
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<9>
          >() +
          RandomGenerator.alphaNumeric(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<11> & tags.Maximum<28>
            >(),
          )
        : undefined),
    swift_bic:
      input?.swift_bic ??
      typia.random<
        string &
          tags.MinLength<8> &
          tags.MaxLength<11> &
          tags.Pattern<"^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}?$">
      >(),
    account_type:
      input?.account_type ??
      RandomGenerator.pick(["checking", "savings", "business"] as const),
    bank_address:
      input?.bank_address ??
      (typia.random<number>() % 2 === 0
        ? RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }) +
          ", " +
          RandomGenerator.name(1) +
          ", " +
          (input?.country_code ??
            RandomGenerator.pick(["KR", "US", "JP", "DE", "UK"] as const))
        : undefined),
    contact_email:
      input?.contact_email ??
      (typia.random<number>() % 2 === 0
        ? RandomGenerator.alphabets(5) +
          "@" +
          (input?.bank_name?.replace(/[^a-zA-Z]/g, "") ?? "bank") +
          ".com"
        : undefined),
    contact_phone:
      input?.contact_phone ??
      (typia.random<number>() % 2 === 0
        ? "+" +
          (input?.country_code === "US"
            ? "1"
            : input?.country_code === "KR"
              ? "82"
              : input?.country_code === "JP"
                ? "81"
                : input?.country_code === "DE"
                  ? "49"
                  : "44") +
          RandomGenerator.alphaNumeric(8)
        : undefined),
  };
}
