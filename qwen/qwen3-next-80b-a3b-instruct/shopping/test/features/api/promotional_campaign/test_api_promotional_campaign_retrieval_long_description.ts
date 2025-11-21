import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

/**
 * Test retrieval of a promotional campaign with very long description text.
 * Validates system correctly handles and returns campaign description content
 * that exceeds normal length limits, confirming proper string handling and
 * encoding. Since campaign creation is not supported by API, we test retrieval
 * of an existing campaign with a long description by generating a campaign ID
 * and verifying the system returns a string value of which we validate type and
 * structure, confirming the API can return long strings.
 */
export async function test_api_promotional_campaign_retrieval_long_description(
  connection: api.IConnection,
) {
  // Generate a random UUID for campaign ID (we don't control actual content, but can validate response structure)
  const campaignId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Retrieve the promotional campaign
  const result: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      { campaignId },
    );

  // Validate type safety - since IShoppingMallPromotionalCampaign is a string type, this confirms
  // the API returns a string, and typia.assert verifies it meets the string type requirements
  typia.assert(result);

  // Validate that the result is a non-empty string (implies it contains a description)
  TestValidator.predicate(
    "campaign description is a non-empty string",
    result.length > 0,
  );

  // Validate that the string has reasonable length (to confirm system handles long descriptions)
  // We don't know the exact expected length, but if it's over 100 characters, it suggests reasonable long string handling
  TestValidator.predicate(
    "campaign description has reasonable length",
    result.length >= 100,
  );

  // Validate that the string is a valid UTF-8 string without control characters
  // (a practical test for encoding/unicode handling, using character range check)
  TestValidator.predicate(
    "campaign description contains only valid characters",
    /^[ -~ -ÿĀ-ſƀ-ɏɐ-ʯ̀-ͯͰ-ϿЀ-ӿԀ-ԯ԰-֏֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿߀-߿ऀ-ॿঀ-৿਀-੿઀-૿଀-୿஀-௿ఀ-౿ಀ-೿ഀ-ൿ඀-෿฀-๿຀-໿ༀ-࿿က-႟Ⴀ-ჿᄀ-ᇿሀ-፿ᎀ-᎟Ꭰ-᏿᐀-ᙿ -᚟ᚠ-᛿ᜀ-ᜟᜠ-᜿ᝀ-᝟ᝠ-᝿ក-៿᠀-᢯ᢰ-᣿ᤀ-᥏ᥐ-᥿ᦀ-᧟᧠-᧿ᨀ-᨟ᨠ-᩟᩠-᩿᪀-᫿ᬀ-᭿ᮀ-ᮿᯀ-᯿ᰀ-ᱏ᱐-᱿ᲀ-᳿ᴀ-ᵿᶀ-ᶿ᷀-᷿Ḁ-ỿἀ-῿ -⁯⁰-₟₠-⃏⃐-⃿℀-⅏⅐-↏←-⇿∀-⋿⌀-⏿␀-␿⑀-⑟①-⓿─-╿▀-▟■-◿☀-⛿✀-➿⟀-⟯⟰-⟿⠀-⣿⤀-⥿⦀-⧿⨀-⫿⬀-⯿Ⰰ-ⱟⱠ-ⱿⲀ-⳿ⴀ-⴯ⴰ-⵿ⶀ-⷟ⷠ-ⷿ⸀-⹿⺀-⻿⼀-⿟⿰-⿿　-〿぀-ゟ゠-ヿ㄀-ㄯ㄰-㆏㆐-㆟ㆠ-ㆿ㇀-㇯ㇰ-ㇿ㈀-㋿㌀-㏿㐀-䶿䷀-䷿一-鿿ꀀ-꒏꒐-꓏ꓐ-꓿ꔀ-꘿Ꙁ-ꚟꚠ-꛿꜀-ꜟ꜠-ꟿꠀ-꠯꠰-꠿ꡀ-꡿ꢀ-꣟꣠-ꣿ꤀-꤯ꤰ-꥟ꥠ-꥿ꦀ-꧟ꧠ-꧿ꨀ-꩟ꩠ-ꩿꪀ-꫟ꫠ-꫿꬀-꬯ꬰ-꭯ꭰ-ꮿꯀ-꯿�-��-􏰀-�-豈-﫿ﬀ-ﭏﭐ-﷿︀-️︐-︟︠-︯︰-﹏﹐-﹯ﹰ-﻿＀-￯０-？＠-＿｀-｟｠-ｯｰ-ﾟﾠ-﾿￀-￟￠-￯￰-￿]+$/u.test(
      result,
    ),
  );
}
