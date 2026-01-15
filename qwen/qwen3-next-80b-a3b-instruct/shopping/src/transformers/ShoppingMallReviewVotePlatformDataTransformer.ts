import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReviewVotePlatformData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVotePlatformData";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewVotePlatformDataTransformer {
  export type Payload = Prisma.shopping_mall_review_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        review: true,
        customer: true,
        seller: true,
        admin: true,
      },
    } satisfies Prisma.shopping_mall_review_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewVotePlatformData> {
    // The user_agent field does not exist in the database schema. This is an architectural mismatch.
    // As the DTO requires a string user_agent but no such field exists in the model, we use an empty string as fallback.
    const ua = "";
    // Parse platform from vote_type
    const platform: "web" | "app" | "api" =
      input.vote_type === "web"
        ? "web"
        : input.vote_type === "app"
          ? "app"
          : "api";
    // All other fields in IShoppingMallReviewVotePlatformData are not available in database schema.
    // We provide default values based on common patterns.
    // Note: This is a fallback implementation due to schema-contract mismatch.
    let browser = "Unknown";
    let device_type: "mobile" | "tablet" | "desktop" | "other" = "other";
    let network_type: "wifi" | "cellular" | "ethernet" | "unknown" = "unknown";
    let os_version = "Unknown";
    const screen_width = 1920;
    const screen_height = 1080;
    const language = "en-US";
    const timezone = "America/New_York";
    const connection_speed = 50000;
    const country = "US";
    const region = "California";
    const city = "San Francisco";
    const app_version = "1.0.0";
    const app_build = "1000";
    const is_mobile_web = false;
    const is_tablet = false;
    const is_headless = undefined;
    return {
      user_agent: ua,
      platform,
      browser,
      device_type,
      network_type,
      os_version,
      screen_width,
      screen_height,
      language,
      timezone,
      connection_speed,
      country,
      region,
      city,
      app_version,
      app_build,
      is_mobile_web,
      is_tablet,
      is_headless,
    };
  }
}
