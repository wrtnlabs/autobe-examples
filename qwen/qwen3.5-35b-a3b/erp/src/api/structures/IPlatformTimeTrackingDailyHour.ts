import { tags } from "typia";

export namespace IPlatformTimeTrackingDailyHour {
  /**
   * Response type for the daily hours endpoint that returns the total hours logged by the authenticated employee for today's date.
   *
   * This response provides the employee's total work hours for the current day in the organization's timezone, calculated from all timelogs created today. The hours are displayed as a numeric value with unit indication on the personal dashboard, enabling employees to track their daily productivity.
   *
   * Key Features:
   *
   * - Calculated in organization timezone for consistent reporting across different geographical regions
   * - Returns 0.00 if no timelogs exist for the day
   * - Includes date context for clarity across timezones
   */
  export type IResponse = {
    /**
     * Total work hours logged today in the organization's timezone.
     *
     * This value represents the sum of all timelogs created by the authenticated employee on the current date, calculated by dividing total duration_minutes by 60 to convert to hours. If no timelogs exist for today, this value will be 0.00.
     *
     * <em>Display Usage</em>
     *
     * This value is typically displayed on the personal dashboard as a numeric value (e.g., "8.5 hours") to show employees how much time they've logged for the current day.
     *
         * @x-autobe-specification Aggregation of duration_minutes from
         *   hrm_platform_timelogs for the current day in organization timezone.
         *   Formula: SUM(CAST(duration_minutes AS FLOAT)) / 60. Returns 0.00 if
         *   no timelogs exist for today.
     *
     * Calculation Steps:
     * 1. Extract employee_id from authentication context (session token)
     * 2. Query hrm_platform_time_tracking_timezones to get organization timezone
     * 3. Calculate today's date range in organization timezone (00:00:00 to 23:59:59)
     * 4. Filter hrm_platform_timelogs by employee_id and date range
     * 5. Aggregate: SUM(duration_minutes) from filtered results
     * 6. Convert minutes to hours: SUM / 60
     * 7. Return 0.00 if no timelogs exist
     */
    hours: number;

    /**
     * The date context in organization timezone (YYYY-MM-DD format) showing which day the hours were calculated for.
     *
     * This date reflects the current date according to the organization's configured timezone, ensuring consistent reporting across different geographical regions. For example, if an employee in Tokyo timezone creates a timelog at 11 PM JST on April 6, this field will show "2026-04-06" even if the server is in a different timezone.
     *
     * <em>Display Usage</em>
     *
     * This field provides clarity for users viewing data from different timezones, ensuring they know exactly which day the hours were calculated for.
     *
         * @x-autobe-specification Date context in organization timezone
         *   (YYYY-MM-DD format), derived from the organization's timezone
         *   configuration in hrm_platform_time_tracking_timezones and the
         *   current server date in that timezone.
     *
     * Calculation Steps:
     * 1. Query hrm_platform_time_tracking_timezones to get organization timezone
     * 2. Calculate current date in that timezone (YYYY-MM-DD format)
     * 3. Return as string in ISO date format
     */
    date: string & tags.Format<"date">;
  };
}
