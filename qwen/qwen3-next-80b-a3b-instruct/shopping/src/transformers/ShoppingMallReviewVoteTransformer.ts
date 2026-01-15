import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import { IShoppingMallReviewVotePlatformData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVotePlatformData";
import { IShoppingMallReviewVoteIpLocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVoteIpLocation";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallReviewVotePlatformDataTransformer } from "./ShoppingMallReviewVotePlatformDataTransformer";

export namespace ShoppingMallReviewVoteTransformer {
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
        review: {
          select: {
            id: true,
            rating: true,
            vote_count: true,
            helpful_vote_count: true,
            unhelpful_vote_count: true,
            version: true,
            created_at: true,
            updated_at: true,
            category: true,
            type: true,
          },
        },
        customer: {
          select: {
            ip: true,
            user_agent: true,
            referrer: true,
            url: true,
            reviewer_id: true,
            reviewer_membership: true,
            vote_reason: true,
            ip_location: true,
            region: true,
          },
        },
        seller: {
          select: {
            status: true,
            flag_reason: true,
            flagged_by: true,
            flagged_at: true,
            resolved_at: true,
            resolution_notes: true,
          },
        },
        admin: {
          select: {
            status: true,
            flag_reason: true,
            flagged_by: true,
            flagged_at: true,
            resolved_at: true,
            resolution_notes: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_review_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewVote> {
    // Handle null cases properly
    const customer = input.customer;
    const seller = input.seller;
    const admin = input.admin;
    const review = input.review;
    // Construct platform_data from customer fields only
    const platform_data =
      await ShoppingMallReviewVotePlatformDataTransformer.transform({
        user_agent: customer?.user_agent ?? "",
        platform: "web",
        browser: customer?.user_agent?.includes("Chrome")
          ? "Chrome"
          : customer?.user_agent?.includes("Firefox")
            ? "Firefox"
            : customer?.user_agent?.includes("Safari")
              ? "Safari"
              : "Unknown",
        device_type: "desktop",
        network_type: "unknown",
        os_version: customer?.user_agent?.includes("Android")
          ? "Android"
          : customer?.user_agent?.includes("iOS")
            ? "iOS"
            : "Unknown",
        screen_width: 0,
        screen_height: 0,
        language: "en-US",
        timezone: "UTC",
        connection_speed: 0,
        country: customer?.region ?? "",
        region: customer?.region ?? "",
        city: "Unknown",
        app_version: "1.0.0",
        app_build: "1",
        is_mobile_web: false,
        is_tablet: false,
        is_headless: false,
      });
    return {
      id: input.id,
      value: review?.type ?? "",
      created_at: toISOStringSafe(review?.created_at),
      updated_at: toISOStringSafe(review?.updated_at),
      status: seller?.status ?? admin?.status ?? "active",
      ip_address: customer?.ip ?? "",
      user_agent: customer?.user_agent ?? "",
      referrer: customer?.referrer ?? "",
      href: customer?.url ?? "",
      review_public_id: review?.id ?? "",
      review_rating: review?.rating ?? 0,
      vote_count: review?.vote_count ?? 0,
      helpful_vote_count: review?.helpful_vote_count ?? 0,
      unhelpful_vote_count: review?.unhelpful_vote_count ?? 0,
      version: review?.version ?? 0,
      flag_reason: seller?.flag_reason ?? admin?.flag_reason ?? undefined,
      flagged_by: seller?.flagged_by ?? admin?.flagged_by ?? undefined,
      flagged_at: toISOStringSafe(seller?.flagged_at ?? admin?.flagged_at),
      resolved_at: toISOStringSafe(seller?.resolved_at ?? admin?.resolved_at),
      resolution_notes:
        seller?.resolution_notes ?? admin?.resolution_notes ?? undefined,
      reviewer_id: customer?.reviewer_id ?? undefined,
      reviewer_membership: customer?.reviewer_membership ?? undefined,
      vote_status_short: review?.type === "helpful" ? "H" : "U",
      vote_mechanism: "web",
      review_category: review?.category ?? undefined,
      region: customer?.region ?? undefined,
      flag_creation_date: toISOStringSafe(
        seller?.flagged_at ?? admin?.flagged_at,
      ),
      vote_reason: customer?.vote_reason ?? undefined,
      platform_data,
      ip_location: customer?.ip_location ?? undefined,
    };
  }
}
