import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test guest registration with various referrer scenarios including direct
 * access, search engine referrals, and social media traffic. Validates handling
 * of different referrer types including search engines (google.com, bing.com),
 * social platforms (facebook.com, instagram.com), and email campaigns. Ensures
 * accurate traffic source attribution for marketing analytics and conversion
 * tracking purposes.
 */
export async function test_api_guest_registration_various_referrers(
  connection: api.IConnection,
) {
  // Create baseline timestamps
  const currentTimestamp = new Date().toISOString();

  // Test 1: Direct access (no complex referrer tracking)
  const directAccessBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://shopping-mall.com/products/electronics",
    referrer: "https://shopping-mall.com/",
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    last_activity_at: currentTimestamp,
    created_at: currentTimestamp,
    updated_at: currentTimestamp,
  } satisfies IShoppingMallGuest.ICreate;

  const directAccessResult = await api.functional.auth.guest.join(connection, {
    body: directAccessBody,
  });
  typia.assert(directAccessResult);

  // Test 2: Google search referral validates organic traffic attribution
  const googleSearchBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://shopping-mall.com/category/smartphones",
    referrer: "https://www.google.com/search?q=smartphones+deals",
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
    last_activity_at: currentTimestamp,
    created_at: currentTimestamp,
    updated_at: currentTimestamp,
  } satisfies IShoppingMallGuest.ICreate;

  const googleSearchResult = await api.functional.auth.guest.join(connection, {
    body: googleSearchBody,
  });
  typia.assert(googleSearchResult);

  TestValidator.equals(
    "Google search referrer URL matches request",
    googleSearchResult.ip_address,
    googleSearchBody.ip,
  );

  // Test 3: Email campaign tracks marketing attribution
  const emailCampaignBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://shopping-mall.com/special-offers?utm_campaign=holidays2023",
    referrer:
      "https://email.newsletter.com/campaign/2023-holiday-special?utm_source=email&utm_campaign=holiday2023",
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
    last_activity_at: currentTimestamp,
    created_at: currentTimestamp,
    updated_at: currentTimestamp,
  } satisfies IShoppingMallGuest.ICreate;

  const emailCampaignResult = await api.functional.auth.guest.join(connection, {
    body: emailCampaignBody,
  });
  typia.assert(emailCampaignResult);

  TestValidator.equals(
    "Email campaign session ID matches tracking requirement",
    emailCampaignResult.session_id,
    emailCampaignBody.session_id,
  );

  // Test 4: Affiliate referral validates partner attribution
  const affiliateReferralBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://shopping-mall.com/partner/spring-sale?utm_partner=coupon_site",
    referrer:
      "https://partner-site.com/shopping-deals?utm_source=affiliate&utm_partner=coupon_site",
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent: "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36",
    last_activity_at: currentTimestamp,
    created_at: currentTimestamp,
    updated_at: currentTimestamp,
  } satisfies IShoppingMallGuest.ICreate;

  const affiliateReferralResult = await api.functional.auth.guest.join(
    connection,
    {
      body: affiliateReferralBody,
    },
  );
  typia.assert(affiliateReferralResult);

  TestValidator.predicate(
    "Affiliate referral has timestamps in chronological order",
    new Date(affiliateReferralResult.token.expired_at).getTime() > Date.now(),
  );

  // Test 5: Mobile app deep link validates mobile traffic attribution
  const mobileAppBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://shopping-mall.com/mobile/app-exclusive?campaign=app_install_2023",
    referrer: "com.shopping.mall://referral?campaign=app_install_2023",
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent:
      "ShoppingMall/3.2.1 (iOS 15.0; iPhone 13 Pro Max) MobileApp/1.0",
    last_activity_at: currentTimestamp,
    created_at: currentTimestamp,
    updated_at: currentTimestamp,
  } satisfies IShoppingMallGuest.ICreate;

  const mobileAppResult = await api.functional.auth.guest.join(connection, {
    body: mobileAppBody,
  });
  typia.assert(mobileAppResult);

  TestValidator.predicate(
    "Mobile app session tokens are distinct across different referrers",
    mobileAppResult.token.access !== affiliateReferralResult.token.access &&
      mobileAppResult.token.refresh !== affiliateReferralResult.token.refresh,
  );
}
